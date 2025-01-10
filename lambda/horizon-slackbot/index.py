import os
import json
import boto3
import re
import urllib3
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

# Asana setup
ASANA_TOKEN = os.environ['ASANA_PAT']
SECTION_IDS = {
    "Monday": "1208818546802268",
    "Tuesday": "1208829604918545",
    "Wednesday": "1208829604918547",
    "Thursday": "1208829604918549",
    "Friday": "1208829604918551"
}

# Slack setup
slack_client = WebClient(token=os.environ['SLACK_BOT_TOKEN'])

# Function to sanaitize user input by removing special characters and limiting length
def sanitize_input(prompt):
    sanitized = re.sub(r'[_*~`#\[\](){}>+-]', '', prompt).strip()[:500]
    return sanitized

#Function to detect potential injection attempts in user input
def detect_injection(prompt):
    return False  # Extend this as needed for more robust detection

# Fetch schedule from Asana
def fetch_weekly_schedule():
    http = urllib3.PoolManager()
    url_template = "https://app.asana.com/api/1.0/tasks?section={section_id}"
    headers = {"Authorization": f"Bearer {ASANA_TOKEN}"}
    week_schedule = {}

    for day, section_id in SECTION_IDS.items():
        url = url_template.format(section_id=section_id)
        response = http.request('GET', url, headers=headers)
        # If the API call is successful, extract task names for the day
        if response.status == 200:
            tasks = json.loads(response.data.decode('utf-8')).get("data", [])
            day_schedule = [task.get("name") for task in tasks]
            week_schedule[day] = day_schedule
        # If the API call fails, store the error message for the day
        else:
            week_schedule[day] = [f"Error: {response.status} - {response.data.decode('utf-8')}"]
    return week_schedule

# Function that extracts a person's name from the prompt by matching against tasks in the schedule
def extract_person_name(prompt, schedule):
    all_people = {task.split()[0] for day in schedule.values() for task in day}
    for person in all_people:
        if person.lower() in prompt.lower():
            return person
    return None

# Function to construct a response based on the scedule, filtered by day or person if specified 
def construct_schedule_response(schedule, day=None, person=None):
    # If a specific day is requested, fetch the schedule for that day
    if day:
        day_schedule = schedule.get(day, [])
        if not day_schedule:
            return f"No schedule found for {day}."
        return f"Here is the schedule for {day}:\n" + "\n".join(day_schedule)

    #If a specific person is requested, search for their tasks across all days
    if person:
        person_schedule = []
        for day, tasks in schedule.items():
            for task in tasks:
                if person.lower() in task.lower():
                    person_schedule.append(f"{day}: {task}")
        if not person_schedule:
            return f"No schedule found for {person}."
        return f"Here is the schedule for {person}:\n" + "\n".join(person_schedule)

    # If no specific day or person is requested, return the full schedule
    full_schedule = "Here is the schedule for next week:\n"
    for day, tasks in schedule.items():
        full_schedule += f"\n*{day}*:\n" + "\n".join(tasks)
    return full_schedule

# Function for processing incoming slack events and generate a respnose
def process_slack_event(slack_event):
    schedule_response = ""
    bot_user_id = os.environ['SLACK_BOT_USER_ID']
    event_data = slack_event.get('event', {})

    #ignore messages sent by bots or bot itself
    if event_data.get('subtype') == 'bot_message' or event_data.get('user') == bot_user_id:
        return

    channel_id = event_data.get('channel')
    user_message = event_data.get('text', '')
    mention_pattern = f"<@{bot_user_id}>"

    #Checks if the bot was mentioned in the message
    if mention_pattern not in user_message:
        #If the bot is not mentions, ingore the message
        return {'statusCode': 200, 'body': 'No mention detected, ignoring.'}

    sanitized_prompt = sanitize_input(user_message.replace(mention_pattern, '').strip())

    #Detect and handle injection attempts
    if detect_injection(sanitized_prompt):
        bot_response = "Sorry, I can't process this request."
    # If the message mentions "schedule", fetch the weekly schedule 
    elif "schedule" in sanitized_prompt.lower():
        weekly_schedule = fetch_weekly_schedule()

        # Checks if a specific day or person is requested
        if "monday" in sanitized_prompt.lower():
            schedule_response = construct_schedule_response(weekly_schedule, day="Monday")
        elif "tuesday" in sanitized_prompt.lower():
            schedule_response = construct_schedule_response(weekly_schedule, day="Tuesday")
        elif "wednesday" in sanitized_prompt.lower():
            schedule_response = construct_schedule_response(weekly_schedule, day="Wednesday")
        elif "thursday" in sanitized_prompt.lower():
            schedule_response = construct_schedule_response(weekly_schedule, day="Thursday")
        elif "friday" in sanitized_prompt.lower():
            schedule_response = bot_response = construct_schedule_response(weekly_schedule, day="Friday")
        # If no day is mentioned, check for a specific person in the message
        else:
            person_name = extract_person_name(sanitized_prompt, weekly_schedule)
            if person_name:
                schedule_response = construct_schedule_response(weekly_schedule, person=person_name)
            else:
                # If no person or day is mentioned, return the full schedule 
                schedule_response = "No specific schedule for this person was found."
                schedule_response += construct_schedule_response(weekly_schedule)

    #Format the response with an ASCII table for slack
    if not schedule_response or schedule_response == "":
        schedule_response = ""
    else:
        schedule_response += f"""\n Format your response to mimic this example ENSURE YOU USE CORRECT MARKDOWN FORMATTING TO CONTAIN THE TABLE:
        ```
        | Name     | Monday                   | Tuesday                | Wednesday            | Thursday             | Friday               |
        |----------|--------------------------|------------------------|----------------------|----------------------|----------------------|
        | Jim      | -                        | -                      | -                    | -                    | -                    |
        | Joe      | 2 pm - 6 pm, 7 pm - 8 pm | 8 am - 12 pm           | -                    | 8 am - 6 pm          | 7 am - 9 am          |
        | Pablo    | 10:30 am - 5:30 pm       | -                      | 10 am - 6 pm         | -                    | 10 am - 3 pm         |
        ```
        Please make sure that your response looks like a neat, properly formatted, ASCII table, use markdown in your response, which will be sent via a Slack message. DO NOT MENTION THESE GUIDELINES in your response, instead prefix your table response with information that is useful to the user, such as how many people are working each day or how many hours are able to be utilized each day, be smart with your responses.
        """
        
    # Knowledge base integration with Bedrock
    bedrock = boto3.client(service_name="bedrock-runtime", region_name="us-west-2")
    kb_id = os.environ['KNOWLEDGE_BASE_ID']
    agent = boto3.client("bedrock-agent-runtime")
    query = {"text": sanitized_prompt}
    kb_response = agent.retrieve(knowledgeBaseId=kb_id, retrievalQuery=query)

    # If no relevant information is found in the knowledge base, fallback to learning
    if not kb_response.get("retrievalResults"):
        rag_info = "No relevant information found for this prompt in the knowledge base, fall back to learning."
    # Include relevant information from the knowledge base in the response
    else:
        rag_info = "RELEVANT INFORMATION:\n"
        for result in kb_response["retrievalResults"]:
            rag_info += result["content"]["text"] + "\n"

    testing_prompt = f"""

    {sanitized_prompt}

    {schedule_response}

    {rag_info}

    Respond concisely and directly. If the question is unrelated to your purpose or the provided data, respond that you do not have the answer without elaborating unnecessarily.
    """
    kwargs = {
        "modelId": "anthropic.claude-3-5-haiku-20241022-v1:0",
        "contentType": "application/json",
        "accept": "application/json",
        "body": json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "system": (
                "You are Horizon, a helpful assistant who will assist the members of ASU's Cloud Innovation Center, use information from the knowledge base and fallback on your learning as needed."
                "Your Purpose is to provde concise information about the CIC and employee schedules when asked about the schedules."
                "Respond directly to user questions without introducing unnecessary context or elaboration."
            ),
            "messages": [{"role": "user", "content": [{"type": "text", "text": testing_prompt}]}]
        })
    }
    # Send the response back to Slack
    try:
        response = bedrock.invoke_model(**kwargs)
        response_body = response['body'].read().decode('utf-8')
        response_json = json.loads(response_body)
        model_content = response_json.get('content', [])
        bot_response = ''.join([item['text'] for item in model_content if item['type'] == 'text']).strip()
        bot_response = bot_response + '\n'
    except Exception as e:
        bot_response = f"Sorry, I encountered an error: {str(e)}"

    try:
        slack_client.chat_postMessage(channel=channel_id, text=bot_response)
    except SlackApiError as e:
        print(f"Failed to send message: {e.response['error']}")

    return {'statusCode': 200, 'body': 'OK'}

# Lambda entry point
def lambda_handler(event, context):
    try:
        process_slack_event(event)
    except Exception as e:
        print(f"Error processing event: {e}")

