# Environment Variables Guide

The following environment variables need to be configured in the CDK stack before deployment:

## Required Environment Variables

1. `ASANA_PAT`: Asana Personal Access Token
   - Required for Asana integration
   - Generate from your Asana account settings

2. `ASANA_PROJECT_ID`: Asana Project ID
   - The ID of the Asana project where tasks will be created
   - Found in the URL when viewing your Asana project

3. `CLIENT_ID`: Slack App Client ID
   - Found in your Slack App's Basic Information page
   - Required for Slack OAuth

4. `SLACK_SECRET`: Slack App Client Secret
   - Found in your Slack App's Basic Information page
   - Used for secure communication with Slack

5. `SLACK_BOT_TOKEN`: Slack Bot User OAuth Token
   - Found in your Slack App's OAuth & Permissions page
   - Starts with "xoxb-"

6. `SLACK_BOT_USER_ID`: Slack Bot User ID
   - Found in your Slack App settings
   - Required to identify the bot in conversations

7. `URL`: Websocket API URL 
   - Found in the stages section the API Gateway that is created

## Deployment Instructions

1. Replace all placeholder values (enclosed in `<>`) in the CDK stack with your actual values
2. Make sure all variables are properly configured before deploying
3. Keep these values secure and never commit them to version control

All of these environment variables are required for the proper functioning of the Slack bot and its integrations with Asana and Amazon Bedrock. There are no unnecessary variables in the current configuration.