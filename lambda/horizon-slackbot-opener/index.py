import os
import json
import boto3

# Initialize AWS Lambda client
lambda_client = boto3.client('lambda')

# Environment variable for the second Lambda function
PROCESSING_LAMBDA_ARN = os.environ['PROCESSING_LAMBDA_ARN']

def lambda_handler(event, context):
    try:
        # Parse the Slack event
        slack_event = json.loads(event['body'])
        print("Received Event:", slack_event)

        # Respond to URL verification
        if 'challenge' in slack_event:
            return {
                'statusCode': 200,
                'body': slack_event['challenge']
            }

        # Check if the event is an 'event_callback' and contains the type 'app_mention'
        if slack_event.get('type') == 'event_callback':
            event_data = slack_event.get('event', {})
            
            # Check if the event is an app mention and ensure the bot's own message is ignored
            if event_data.get('type') == 'app_mention':
                # Ignore events from the bot itself
                if event_data.get('bot_id'):
                    print("Ignoring bot's own message.")
                    return {'statusCode': 200, 'body': 'OK'}

                # If it's a valid app mention, invoke the second Lambda function
                print("Valid app mention detected, invoking second Lambda.")
                lambda_client.invoke(
                    FunctionName=PROCESSING_LAMBDA_ARN,
                    InvocationType='Event',  # Asynchronous invocation
                    Payload=json.dumps(slack_event)
                )

                return {'statusCode': 200, 'body': 'OK'}
            else:
                print("Event is not an app_mention. Ignoring.")
                return {'statusCode': 200, 'body': 'OK'}

    except Exception as e:
        print(f"Error: {e}")
        return {'statusCode': 500, 'body': 'Internal Server Error'}
