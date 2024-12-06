# Import required libraries for AWS Lambda function
import os
import json
import boto3

# Initialize AWS service clients for Lambda and API Gateway
lambda_client = boto3.client('lambda')
api_client = boto3.client('apigatewaymanagementapi')

def handle_message(event, connection_id):
    # Get the ARN of the response Lambda function from environment variables
    response_function_arn = os.environ['RESPONSE_FUNCTION_ARN']

    try:
        # Parse the message body and extract prompt and language settings
        body = json.loads(event.get('body', '{}'))
        prompt = body.get('prompt', '')
        language = body.get('language', 'EN')  # Default to 'EN' if not provided
        
        # Log the received language and prompt for debugging
        print(f"Language from request: [{language}]")
        print(f"Prompt from user: [{prompt}]")
        
        # Validate that a prompt was provided
        if not prompt:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Prompt is required'})
            }

        # Prepare input payload for the response Lambda function
        input = {
            "prompt": prompt,
            "connectionId": connection_id,
            "language": language
        }

        # Asynchronously invoke the response Lambda function
        lambda_client.invoke(
            FunctionName=response_function_arn,
            InvocationType='Event',
            Payload=json.dumps(input)
        )
        
        return {'statusCode': 200}
        
    except json.JSONDecodeError as e:
        # Handle JSON parsing errors
        print(f"Error parsing request body: {str(e)}")
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'Invalid JSON in request body'})
        }
    except Exception as e:
        # Handle any unexpected errors
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error'})
        }

def handle_connect(event, connection_id):
    # Handle new WebSocket connections and log the connection ID
    print(f"New client connected with connection id: {connection_id}")
    return {'statusCode': 200}

def lambda_handler(event, context):
    # Log the incoming event for debugging
    print(f"Received event: {json.dumps(event)}")
    
    try:
        # Extract route and connection ID from the event
        route_key = event.get('requestContext', {}).get('routeKey')
        connection_id = event.get('requestContext', {}).get('connectionId')

        # Verify connection ID exists
        if not connection_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Missing connection ID'})
            }

        # Route the request based on the WebSocket action
        if route_key == '$connect':
            return handle_connect(event, connection_id)
        elif route_key == 'sendMessage':
            return handle_message(event, connection_id)
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': f'Unsupported route: {route_key}'})
            }
            
    except Exception as e:
        # Handle any unexpected errors in the main handler
        print(f"Error in lambda_handler: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error'})
        }
