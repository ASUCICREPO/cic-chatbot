# Import required libraries for AWS Lambda function
import os
import json
import boto3

# Initialize AWS service clients for Lambda, API Gateway, and translate
lambda_client = boto3.client('lambda')
api_client = boto3.client('apigatewaymanagementapi')
translate_client = boto3.client('translate')

# Function for handling the sendMessage websocket route
def handle_message(event, connection_id):
    # Get the ARN of the response Lambda function from environment variables
    response_function_arn = os.environ['RESPONSE_FUNCTION_ARN']

    try:
        # Parse the message body and extract prompt and language settings
        body = json.loads(event.get('body', '{}'))
        prompt = body.get('prompt', '')
        language = body.get('language')  # User-specified language
        chat_history = body.get('chatHistory', [])

        # Log the received language and prompt for debugging
        print(f"Language from request: [{language}]")
        print(f"Prompt from user: [{prompt}]")
        print(f"Chat history: [{json.dumps(chat_history)}]")

        # Validate that a prompt was provided
        if not prompt:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Prompt is required'})
            }

        # Translate the prompt to the target language
        try:
            detected_source_language = 'auto'
            translated_prompt = prompt  # Default: use the prompt as-is

            # Only translate if the user specifies a different target language
            if language and language != 'auto':
                translation_response = translate_client.translate_text(
                    Text=prompt,
                    SourceLanguageCode='auto',
                    TargetLanguageCode=language
                )
                detected_source_language = translation_response.get('SourceLanguageCode', 'auto')
                translated_prompt = translation_response['TranslatedText']
                print(f"Detected source language: [{detected_source_language}]")
                print(f"Translated prompt: [{translated_prompt}]")
            else:
                print("No translation needed; using prompt as-is.")


            #If use did not specify a target language, use the detected source language
            response_language = language if language else detected_source_language
            print(f"Response language: [{response_language}]")

        except Exception as translate_error:
            print(f"Error translating text: {str(translate_error)}")
            return {
                'statusCode': 500,
                'body': json.dumps({'message': 'Error translating text'})
            }

        # Prepare input payload for the response Lambda function
        input = {
            "prompt": translated_prompt, #Use the translated prompt
            "chatHistory": chat_history,
            "connectionId": connection_id,
            "language": response_language #Use detected or user-specified language
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

# Function for handling the connect websocket route
def handle_connect(event, connection_id):
    # Handle new WebSocket connections and log the connection ID
    print(f"New client connected with connection id: {connection_id}")
    return {'statusCode': 200}

# Main WebSocket handler for chat application - processes new connections and incoming messages, routing them to appropriate handler functions
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

