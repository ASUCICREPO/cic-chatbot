import os
import json
import boto3

def streamResponseToAPI(response, connectionId):
    url = os.environ['URL']
    gateway = boto3.client("apigatewaymanagementapi", endpoint_url=url)
    print(f"Received response from LLM! Streaming to url: [{url}]")

    #Convert the model specific API response into general packet with start/stop info, here converts from Claude API response (Could be done for any model)
    stream = response.get('body')
    if stream:

        #for each returned token from the model:
        for token in stream:

            #The "chunk" contains the model-specific response
            chunk = token.get('chunk')
            if chunk:
                
                #Decode the LLm response body from bytes
                chunk_text = json.loads(chunk['bytes'].decode('utf-8'))
                
                #Construct the response body based on the LLM response, (Where the generated text starts/stops)
                if chunk_text['type'] == "content_block_start":
                    block_type = "start"
                    message_text = ""
                    
                elif chunk_text['type'] == "content_block_delta":
                    block_type = "delta"
                    message_text = chunk_text['delta']['text']
                    
                elif chunk_text['type'] == "content_block_stop":
                    block_type = "end"
                    message_text = ""

                else:
                    block_type = "blank"
                    message_text = ""
                    
                #Send the response body back through the gateway to the client    
                data = {
                    'statusCode': 200,
                    'type': block_type,
                    'text': message_text
                }
                gateway.post_to_connection(ConnectionId=connectionId, Data=json.dumps(data))

def lambda_handler(event, context):
    connection_id = event["connectionId"]
    prompt = event["prompt"]
    language_code= event["language"]

    kb_id = os.environ['KNOWLEDGE_BASE_ID']
    agent = boto3.client("bedrock-agent-runtime")
    
    if language_code == "EN":
        language = "English"
    else:
        language = "Spanish"
    
    print(f"Question asked: [{prompt}]")
    print(f"Received Language Code: [{language_code}], Output language parameter: [{language}]")
    
    if prompt:
        print(f"Finding in Knowledge Base with ID: [{kb_id}]...")
        query = {"text": prompt}
        kb_response = agent.retrieve(knowledgeBaseId=kb_id, retrievalQuery=query)
        print(f"Updating the prompt for LLM...")
        rag_info = "RELEVENT CLOUD INFORMATION CENTER INFORMATION:\n"
        for response in kb_response["retrievalResults"]:
            rag_info = rag_info + response["content"]["text"] + "\n"
        full_prompt = f"""Use the following information about the Arizona State University Cloud Innovation Center to help answer the user's question. Respond naturally in {language} without mentioning the source of this information:

                        {rag_info}

                        User's question: {prompt}

                        Provide a natural, conversational response to the user's message in {language}."""
    
        bedrock = boto3.client(service_name="bedrock-runtime", region_name="us-west-2")
        
        kwargs = {
            "modelId": "anthropic.claude-3-5-haiku-20241022-v1:0",
            "contentType": "application/json",
            "accept": "application/json",
            "body": json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "system": f"""You are Horizon, a friendly assistant for the Arizona State University Cloud Innovation Center (CIC). Your role is to help users
                    with information about the CIC. Always respond in {language}, even if the query is in another language. Be concise, warm, and conversational, like a helpful Arizona State University professor or faculty member.
                            For general queries, be friendly and offer CIC-related help. Examples:
                            - "Hello!": "Hello, I am Horizon! How can I assist you with the Cloud Innovation Center today?"
                            - "How are you?": "I'm well, thanks! What would you like to know about the Cloud Innovation Center?"
                            - "Can you help?": "Absolutely! What Cloud Innovation Center information do you need?"
                            - "Who are you?": "Hi! I'm Horizon, your guide to the Cloud Innovation Center. How can I help you today?"
                            
                            Guidelines:
                            1. Always respond ONLY in {language}.
                            2. Do NOT introduce yourself in every message. Assume the conversation is ongoing.
                            3. DO NOT use phrases like "Based on the information provided" or "According to the search results" in your responses.
                            4. Use the information you have about the Cloud Innovation Center to answer questions directly and confidently.
                            5. If unsure, politely say so and offer to help with other information.
                            6. Verify any information mentioned by the user against what you know about the Cloud Innovation Center.
                            7. Stay positive and supportive in your responses.
                            8. Provide concise answers. Offer to elaborate if the user wants more details.
                            9. Gently redirect non-CIC topics to Cloud Innovation Center matters.
                            
                            Your goal: Have helpful, natural conversations about the Arizona State University Artificial Intelligence Cloud Innovation Center in {language}, as if you are a knowledegeable staff member.""",
                "messages": [{
                    "role": "user",
                    "content": [{
                        "type": "text",
                        "text": full_prompt
                    }]
                }]
            })
        }
        print(f"Sending query to LLM...")
        response = bedrock.invoke_model_with_response_stream(**kwargs)
        streamResponseToAPI(response, connection_id)
        print("Response processing complete!")
    return {
        'statusCode': 200
    }