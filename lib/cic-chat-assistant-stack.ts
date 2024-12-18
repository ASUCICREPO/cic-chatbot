import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import * as apigatewayv2_integrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface CicChatAssistantStackProps extends cdk.StackProps {
    githubToken: string;
}

export class CicChatAssistantStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props: CicChatAssistantStackProps) {
        super(scope, id, props);
        
        // Define constants for environment variables
        const KNOWLEDGE_BASE_ID = '<KNOWLEDGE_BASE_ID>';
        const ORCHESTRATION_MODEL_ID = '<ORCHESTRATION_MODEL_ID>';
        const STAGE = '<STAGE>';
        const WEBSOCKET_API_ID = '<WEBSOCKET_API_ID>';

        // Create the Bedrock knowledge base
        const kb = new bedrock.KnowledgeBase(this, 'knowledge-base-quick-start-z2bdk', {
            embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V2_1024,
            instruction: 'Use this knowledge base to answer questions about the Cloud Innovation Center',
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
        
        // Creates IAM policy for bedrock
        const bedrockPolicy = new iam.PolicyStatement({
            actions: ['bedrock:*'],
            resources: ['*'],
          });

        // get-response-from-bedrock Lambda function
        const getResponseFromBedrockLambda = new lambda.Function(this, 'get-response-from-bedrock', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset('lambda/get-response-from-bedrock'),
            handler: 'index.handler',
            environment: {
                KNOWLEDGE_BASE_ID: KNOWLEDGE_BASE_ID,
                ORCHESTRATION_MODEL_ID: ORCHESTRATION_MODEL_ID,
                STAGE: STAGE,
                URL: webSocketStage.url,
                WEBSOCKET_API_ID: WEBSOCKET_API_ID
            },
            timeout: cdk.Duration.seconds(300),
            memorySize: 256
        });

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
      
        // web-socket-handler Lambda function
        const webSocketHandler = new lambda.Function(this, 'web-socket-handler', {
        runtime: lambda.Runtime.PYTHON_3_12,
        code: lambda.Code.fromAsset('lambda/web-socket-handler'),
        handler: 'index.handler',
        environment: {
            RESPONSE_FUNCTION_ARN: '<RESPONSE_FUNCTION_ARN>'
        }
        });

        getResponseFromBedrockLambda.grantInvoke(webSocketHandler);

        const webSocketIntegration = new apigatewayv2_integrations.WebSocketLambdaIntegration('cic-web-socket-integration', webSocketHandler);

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