import json
import os
import csv
import base64
import time
from dotenv import load_dotenv
from google import genai
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def get_gmail_service():
    """Shows basic usage of the Gmail API.
    Lists the user's Gmail labels.
    """
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists('credentials.json'):
                print("Error: 'credentials.json' not found. Please download it from Google Cloud Console.")
                return None
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    try:
        service = build('gmail', 'v1', credentials=creds)
        return service
    except HttpError as error:
        print(f'An error occurred: {error}')
        return None

def search_messages(service, query):
    try:
        result = service.users().messages().list(userId='me', q=query).execute()
        messages = result.get('messages', [])
        return messages
    except HttpError as error:
        print(f'An error occurred: {error}')
        return []

def get_message_body(service, msg_id):
    try:
        message = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
        
        # Function to extract text from email payload
        def get_text_from_payload(payload):
            body = ""
            if 'parts' in payload:
                for part in payload['parts']:
                    body += get_text_from_payload(part)
            elif payload.get('mimeType') in ['text/plain', 'text/html']:
                data = payload['body'].get('data')
                if data:
                    try:
                        # Fix base64 padding
                        data += "=" * ((4 - len(data) % 4) % 4)
                        text = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                        body += text
                    except Exception as e:
                        print(f"Error decoding email body: {e}")
            return body

        payload = message.get('payload', {})
        return get_text_from_payload(payload)
    except HttpError as error:
        print(f'An error occurred: {error}')
        return ""

def analyze_with_gemini(company_name, job_title, emails_content):
    # If no emails, it's 'not received a response'
    if not emails_content.strip():
        return 'not received a response'
        
    prompt = f"""
    You are an AI assistant helping me determine the status of my job application.
    I applied to the company '{company_name}' for the position '{job_title}'.
    
    Below is the content of the emails I've received that mention this company in the last month.
    Based on the email content, classify the status of my application into EXACTLY ONE of the following three categories:
    - 'rejected' (if they decided not to move forward with my application)
    - 'interview' (if they are inviting me to an interview, asking for availability, or moving to the next step)
    - 'not received a response' (if the emails are just automated confirmations of the application being received, promotional emails, or unrelated to this job application)
    
    Only output the category name exactly as written above in lowercase. No other text.
    
    Email Content:
    {emails_content}
    """
    
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    
    while True:
        try:
            response = client.models.generate_content(model='gemini-2.5-flash-lite', contents=prompt)
            text = response.text.strip().lower()
            
            if 'rejected' in text:
                return 'rejected'
            elif 'interview' in text:
                return 'interview'
            else:
                return 'not received a response'
        except Exception as e:
            error_str = str(e)
            if '429' in error_str or 'quota' in error_str.lower():
                print(f"     [!] Rate limit reached. Waiting 20 seconds before retrying {company_name}...", flush=True)
                time.sleep(20)
                continue
            else:
                print(f"Error calling Gemini API for {company_name}: {e}")
                return 'error'

def main():
    print("Initializing...")
    
    # Load variables from .env file
    load_dotenv()
    
    # Setup Gemini API
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY is not set.")
        print("Please create a .env file in this folder and add: GEMINI_API_KEY=\"your_api_key_here\"")
        return
        
    # Note: genai.Client is instantiated directly when calling the API
    
    # Load JSON data (export this file from the browser extension; see README.md)
    json_path = 'linkedin_job_data.json'
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found. Export it from the browser extension first.")
        return
        
    print(f"Loading job data from {json_path}...")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    # Filter jobs for saved: true and ignore missing company names
    saved_jobs = []
    for job_id, details in data.items():
        company_name = details.get('companyName')
        
        # Skip if not saved or if company name is missing/invalid
        if details.get('saved') != True:
            continue
        if not company_name or company_name.strip() in ['', 'N/A', 'Unknown', 'Unknown Company']:
            continue
            
        saved_jobs.append({
            'id': job_id,
            'companyName': company_name,
            'title': details.get('title', 'Unknown Role')
        })
            
    print(f"Found {len(saved_jobs)} saved jobs.")
    
    # Authenticate Gmail
    print("Authenticating with Gmail...")
    service = get_gmail_service()
    if not service:
        print("Failed to authenticate with Gmail. Make sure you have credentials.json in this folder.")
        return
        
    results = []
    csv_file = 'job_application_status.csv'
    
    # Load previously completed jobs so we only retry the ones that failed
    completed_jobs = set()
    if os.path.exists(csv_file):
        with open(csv_file, 'r', encoding='utf-8') as csvfile_read:
            reader = csv.DictReader(csvfile_read)
            for row in reader:
                if row.get('Status') != 'error':
                    completed_jobs.add(f"{row.get('Company')}||{row.get('Job Title')}")
                    
    print(f"\nWriting results progressively to {csv_file}...", flush=True)
    
    with open(csv_file, 'a', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['Job ID', 'Company', 'Job Title', 'Status', 'Emails Found']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        if not os.path.exists(csv_file) or os.path.getsize(csv_file) == 0:
            writer.writeheader()
        
        # Process each job
        print("Starting email check (this may take some time due to API rate limits)...", flush=True)
        for i, job in enumerate(saved_jobs):
            job_id = job['id']
            company = job['companyName']
            title = job['title']
            
            if f"{company}||{title}" in completed_jobs:
                continue
                
            print(f"[{i+1}/{len(saved_jobs)}] Checking '{company}' for '{title}'...", flush=True)
        
            # First try searching for the exact company name
            query = f'"{company}" newer_than:3m'
            messages = search_messages(service, query)
            
            # If no emails found, try a broader search using just the first word of the company
            if len(messages) == 0:
                import re
                first_word = re.sub(r'[^a-zA-Z0-9]', '', company.split()[0])
                if len(first_word) > 2:
                    query = f'{first_word} newer_than:3m'
                    messages = search_messages(service, query)
            
            # If still no emails found, skip Gemini API completely and do not wait
            if len(messages) == 0:
                status = 'not received a response'
                print(f"   -> Status: {status} (Found 0 matching emails)", flush=True)
                
                results.append({'Job ID': job_id, 'Company': company, 'Job Title': title, 'Status': status, 'Emails Found': 0})
                writer.writerow(results[-1])
                csvfile.flush()
                
                data[job['id']]['status'] = status
                data[job['id']]['emailsFound'] = 0
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2)
                    
                continue
                
            all_emails_content = ""
            # Process up to 15 most recent emails to prevent hitting context limits
            for msg in messages[:15]:
                body = get_message_body(service, msg['id'])
                all_emails_content += body + "\n\n---\n\n"
            
            # Optional: Truncate email content if it's too long for the prompt
            all_emails_content = all_emails_content[:30000] 
            
            status = analyze_with_gemini(company, title, all_emails_content)
            
            print(f"   -> Status: {status} (Found {len(messages)} matching emails)", flush=True)
            
            results.append({
                'Job ID': job_id,
                'Company': company,
                'Job Title': title,
                'Status': status,
                'Emails Found': len(messages)
            })
            
            writer.writerow(results[-1])
            csvfile.flush()
            
            data[job['id']]['status'] = status
            data[job['id']]['emailsFound'] = len(messages)
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            
            # Sleep 6.5 seconds to safely stay below the strict 15 RPM (Requests Per Minute) free tier limit
            if i < len(saved_jobs) - 1:
                time.sleep(6.5)

    print(f"\nDone! Results successfully saved to {csv_file}", flush=True)
    
    # Print summary
    rejected = sum(1 for r in results if r['Status'] == 'rejected')
    interview = sum(1 for r in results if r['Status'] == 'interview')
    no_response = sum(1 for r in results if r['Status'] == 'not received a response')
    error = sum(1 for r in results if r['Status'] == 'error')
    
    print(f"\n--- SUMMARY ---")
    print(f"Total checked: {len(results)}")
    print(f"- Rejected: {rejected}")
    print(f"- Interview: {interview}")
    print(f"- Not Received a Response: {no_response}")
    if error > 0:
        print(f"- Error processing: {error}")

if __name__ == '__main__':
    main()
