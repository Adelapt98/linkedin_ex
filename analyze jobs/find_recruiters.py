import json, csv
from datetime import datetime, timedelta, timezone

# Load CSV
csv_jobs = set()
with open('job_application_status_backup.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        csv_jobs.add(f"{row['Company']}||{row['Job Title']}")

# Load JSON (export this file from the browser extension; see README.md)
with open('linkedin_job_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Time 10 days ago
ten_days_ago = datetime.now(timezone.utc) - timedelta(days=10)

csv_file = 'old_applications_recruiters.csv'
with open(csv_file, 'w', newline='', encoding='utf-8') as out:
    fieldnames = ['Company', 'Job Title', 'Date Applied', 'Recruiter Name', 'Recruiter Link', 'Email', 'Job Link']
    writer = csv.DictWriter(out, fieldnames=fieldnames)
    writer.writeheader()
    
    count = 0
    for k, v in data.items():
        if not v.get('saved'): continue
        
        company = v.get('companyName')
        title = v.get('title')
        
        if f"{company}||{title}" not in csv_jobs:
            continue
            
        date_str = v.get('dateSaved')
        if not date_str:
            continue
        try:
            saved_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except Exception as e:
            continue
            
        if saved_date < ten_days_ago:
            recruiter = v.get('recruiter')
            email = v.get('email')
            recruiter_link = v.get('recruiterLink')
            job_link = v.get('link')
            
            has_recruiter = recruiter and recruiter != 'N/A'
            has_email = email and email != 'N/A'
            
            if has_recruiter or has_email:
                count += 1
                writer.writerow({
                    'Company': company,
                    'Job Title': title,
                    'Date Applied': saved_date.strftime('%Y-%m-%d'),
                    'Recruiter Name': recruiter if has_recruiter else '',
                    'Recruiter Link': recruiter_link if has_recruiter else '',
                    'Email': email if has_email else '',
                    'Job Link': job_link if job_link else ''
                })

print(f"Found {count} positions.")
print(f"Results successfully written to {csv_file}")
