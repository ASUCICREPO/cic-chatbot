import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import * as apigatewayv2_integrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as amplify from '@aws-cdk/aws-amplify-alpha';

import { Construct } from 'constructs';

interface CicChatAssistantStackProps extends cdk.StackProps {
    githubToken: string;
}

export class CicChatAssistantStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: CicChatAssistantStackProps) {
        super(scope, id, props);
        
        // Create the Bedrock knowledge base
        const kb = new bedrock.KnowledgeBase(this, 'knowledge-base-quick-start-z2bdk', {
            embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V2_1024,
            instruction: 'Use this knowledge base to answer questions about the Cloud Innovation Center',
        });

        // get-response-from-bedrock Lambda function
        const getResponseFromBedrockLambda = new lambda.Function(this, 'get-response-from-bedrock', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset('lambda/get-response-from-bedrock'),
            handler: 'index.handler',
            environment: {
                KNOWLEDGE_BASE_ID: kb.knowledgeBaseId,
                URL: 'URL'
            },
            timeout: cdk.Duration.seconds(300),
            memorySize: 256
        });

        // Grant permissions to access Bedrock for getResponseFromBedrockLambda
        kb.grantRead(getResponseFromBedrockLambda);
        getResponseFromBedrockLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: ['bedrock:InvokeModel'],
            resources: ['*'],
        }));

        // Environment variables with placeholder values to guide users
            const slackBotEnvVars = {
                ASANA_PAT: '<ASANA_PAT>',
                ASANA_PROJECT_ID: '<ASANA_PROJECT_ID>',
                CLIENT_ID: '<CLIENT_ID>',
                SLACK_SECRET: '<CLIENT_SECRET>',
                KNOWLEDGE_BASE_ID: kb.knowledgeBaseId,
                SLACK_BOT_TOKEN: '<SLACK_BOT_TOKEN>',
                SLACK_BOT_USER_ID: '<SLACK_BOT_USER_ID>'
            };

        // Create Lambda function for Slack bot message processing
        const slackBotProcessor = new lambda.Function(this, 'SlackBotProcessor', {
            runtime: lambda.Runtime.PYTHON_3_9,
            code: lambda.Code.fromAsset('lambda/slack-bot-processor'),
            handler: 'index.handler',
            environment: slackBotEnvVars,
            timeout: cdk.Duration.minutes(5),
            memorySize: 1024,
        });

        // Grant permissions to access Bedrock
        kb.grantRead(slackBotProcessor);
        slackBotProcessor.addToRolePolicy(new iam.PolicyStatement({
            actions: ['bedrock:InvokeModel'],
            resources: ['*'],
        }));
        
        // Add permissions for Asana API access
        slackBotProcessor.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'lambda:InvokeFunction'
            ],
            resources: ['*'],
        }));

        

        // Create Lambda function for Slack bot opener
        const slackBotOpener = new lambda.Function(this, 'SlackBotOpener', {
            runtime: lambda.Runtime.PYTHON_3_9,
            code: lambda.Code.fromAsset('lambda/slack-bot-opener'),
            handler: 'index.handler',
            environment: {
                RESPONSE_FUNCTION_ARN: slackBotProcessor.functionArn
            },
            timeout: cdk.Duration.minutes(1),
            memorySize: 256,
        });

        // Grant permissions for opener to invoke processor and response function
        slackBotProcessor.grantInvoke(slackBotOpener);
        getResponseFromBedrockLambda.grantInvoke(slackBotOpener);

        // Create HTTP API Gateway
        const httpApi = new apigatewayv2.HttpApi(this, 'SlackBotApi', {
            apiName: 'slack-bot-api',
        });

        // Add route for Slack bot opener
        httpApi.addRoutes({
            path: '/slack/events',
            methods: [apigatewayv2.HttpMethod.POST],
            integration: new apigatewayv2_integrations.HttpLambdaIntegration(
                'SlackBotIntegration',
                slackBotOpener
            ),
        });

        // Output the API endpoint URL
        new cdk.CfnOutput(this, 'SlackBotApiUrl', {
            value: httpApi.url!,
            description: 'URL of the Slack bot API endpoint',
        });

        // Create the S3 bucket to house our data
        const kb_bucket = new s3.Bucket(this, 'cic-doc-bucket', {
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        const s3_data_source = new bedrock.S3DataSource(this, 'cic-document-datasource', {
            bucket: kb_bucket,
            knowledgeBase: kb,
            dataSourceName: 'cic-document-datasource',
            chunkingStrategy: bedrock.ChunkingStrategy.DEFAULT,
            // maxTokens: 500,
            // overlapPercentage: 20,
          });
        
        
        // web-socket-handler Lambda function
        const webSocketHandler = new lambda.Function(this, 'web-socket-handler', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset('lambda/web-socket-handler'),
            handler: 'index.handler',
            environment: {
                RESPONSE_FUNCTION_ARN: getResponseFromBedrockLambda.functionArn
            },
            timeout: cdk.Duration.seconds(300),
            memorySize: 256
        });

        // Grant permission to invoke response function
        getResponseFromBedrockLambda.grantInvoke(webSocketHandler);

        // Grant Amazon Translate permissions to web-socket-handler
        webSocketHandler.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['translate:TranslateText', 'translate:DetectDominantLanguage'],
            resources: ['*']
        }));

        const webSocketIntegration = new apigatewayv2_integrations.WebSocketLambdaIntegration('cic-web-socket-integration', webSocketHandler);

        // Web Socket API
        const webSocketApi = new apigatewayv2.WebSocketApi(this, 'cic-web-socket-api', {
            apiName: 'cic-web-socket-api',
            connectRouteOptions: { integration: webSocketIntegration },
            disconnectRouteOptions: { integration: webSocketIntegration },
        });

        const webSocketStage = new apigatewayv2.WebSocketStage(this, 'cic-web-socket-stage', {
            webSocketApi,
            stageName: 'production',
            autoDeploy: true,
        });

        const webSocketApiArn = `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/${webSocketStage.stageName}/POST/@connections/*`;
        
        

        // Update getResponseFromBedrockLambda environment variables now that WebSocket resources exist
        getResponseFromBedrockLambda.addEnvironment('URL', webSocketStage.url);
        getResponseFromBedrockLambda.addEnvironment('WEBSOCKET_API_ID', webSocketApi.apiId);

        getResponseFromBedrockLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: [
              'bedrock:InvokeModel',
              'bedrock-agent-runtime:Retrieve',
              'bedrock-runtime:InvokeModel',
              'bedrock-runtime:InvokeModelWithResponseStream',
              'bedrock:Retrieve',
              'bedrock:InvokeModelWithResponseStream',
              'execute-api:ManageConnections',
              'execute-api:Invoke'
            ],
            resources: [
              `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${kb.knowledgeBaseId}`,
              `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0`,
              `arn:aws:bedrock:${this.region}:${this.account}:agent-runtime/*`,
              `arn:aws:bedrock:${this.region}:${this.account}:*`,
              webSocketApiArn
            ]
          }));
      
        getResponseFromBedrockLambda.grantInvoke(webSocketHandler);

        webSocketApi.addRoute('sendMessage',
        {
            integration: webSocketIntegration,
            returnResponse: true
        }
        );

        webSocketHandler.addToRolePolicy(new iam.PolicyStatement({
        actions: [
            'execute-api:ManageConnections',
            'translate:TranslateText',
            'lambda:InvokeFunction',
            'bedrock:*',
            'bedrock-runtime:*'
        ],
        resources: ['*'],
        }));

        // GitHub personal access token stored in Secrets Manager
        const githubToken = new secretsmanager.Secret(this, 'GitHubToken', {
        secretName: 'cic-github-token',
        description: 'GitHub Personal Access Token for Amplify',
        secretStringValue: cdk.SecretValue.unsafePlainText(props.githubToken)
        });

        // Create the Amplify App
        const amplifyApp = new amplify.App(this, 'cicChatbotReactApp', {
        sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
          owner: 'ASUCICREPO',
          repository: 'cic-chatbot',
          oauthToken: githubToken.secretValue
        }),
        buildSpec: cdk.aws_codebuild.BuildSpec.fromObjectToYaml({
          version: '1.0',
          frontend: {
            phases: {
              preBuild: {
                commands: [
                  'cd frontend',
                  'npm ci'
                ]
              },
              build: {
                commands: [
                  'npm run build'
                ]
              }
            },
            artifacts: {
              baseDirectory: 'frontend/build',
              files: [
                '**/*'
              ]
            },
            cache: {
              paths: [
                'frontend/node_modules/**/*'
              ]
            }
          }
        }),
      });
  
      // Add environment variables
      amplifyApp.addEnvironment('REACT_APP_WEBSOCKET_API', webSocketStage.url);
  
      // Add a branch
      const mainBranch = amplifyApp.addBranch('release', {
        autoBuild: true,
        stage: 'PRODUCTION'
      });
  
      // Grant Amplify permission to read the secret
      githubToken.grantRead(amplifyApp);
  
      new cdk.CfnOutput(this, 'GitHubTokenSecretArn', {
        value: githubToken.secretArn,
        description: 'ARN of the gitHub Token Secret',
      });
  
      new cdk.CfnOutput(this, 'DocumentBucketName', {
        value: kb_bucket.bucketName,
        description: 'Document S3 Bucket Name',
      });
  
      new cdk.CfnOutput(this, 'KnowledgeBaseId', {
        value: kb.knowledgeBaseId,
        description: 'Bedrock Knowledge Base ID'
      });
  
      new cdk.CfnOutput(this, 'S3DataSourceId', {
        value: s3_data_source.dataSourceId,
        description: 'S3 Data Source ID',
      });

  
      new cdk.CfnOutput(this, 'WebSocketHandlerLambdaName', {
        value: webSocketHandler.functionName,
        description: 'Web Socket Handler Lambda Function Name'
      });
  
      new cdk.CfnOutput(this, 'GetResponseFromBedrockLambdaName', {
        value: getResponseFromBedrockLambda.functionName,
        description: 'Get Response From Bedrock Lambda Function Name'
      });
  
      new cdk.CfnOutput(this, 'WebSocketURL', {
        value: webSocketStage.callbackUrl,
        description: 'WebSocket URL'
      });
  
      new cdk.CfnOutput(this, 'AmplifyAppURL', {
        value: `https://${mainBranch.branchName}.${amplifyApp.defaultDomain}`,
        description: 'Amplify Application URL'
      });
    }
}