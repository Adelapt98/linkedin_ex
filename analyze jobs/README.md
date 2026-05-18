# Job Status Checker Script

This is a Python script designed to check your job application statuses from your Gmail and categorize them using the free Gemini API. The script is configured to look back exactly **1 month** and will output everything to a **CSV** file (`job_application_status.csv`).

## Files
- `check_job_status.py`: The main script
- `find_recruiters.py`: A utility to cross-reference CSV output with JSON data to find old applications with recruiter contacts
- `requirements.txt`: Python dependencies
- `.env.example`: Template for configuring the Gemini API key
- `linkedin_job_data.json.json`: Input JSON file with job data

## Setup Instructions

> [!IMPORTANT]
> You must complete these API setup steps before running the script!

### 1. Install Dependencies
Open your terminal in this folder and run:
```powershell
pip install -r requirements.txt
```
*(If you are using a virtual environment, make sure it is activated first).*

### 2. Get Gmail API Credentials (`credentials.json`)
Since this script accesses your personal emails, you need to create a Google Cloud Project to authenticate it securely.
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new Project (name it something like `JobChecker`).
3. Go to **APIs & Services > Library** and search for **Gmail API**. Click **Enable**.
4. Go to **APIs & Services > OAuth consent screen**. 
   - Choose **External** and click Create.
   - Fill in the required fields (App name, User support email, Developer contact email). You can ignore the rest. Click Save and Continue.
   - **IMPORTANT**: On the Test Users step, you MUST click the **+ ADD USERS** button, type in your Gmail address (e.g., `adel.aboutalebipirnaeimi@gmail.com`), and click **Save**. If you don't do this, you will get a "403 access_denied" error when running the script!
5. Go to **APIs & Services > Credentials**.
   - Click **Create Credentials > OAuth client ID**.
   - Application type: **Desktop app**.
   - Name it whatever you like, and click Create.
6. A popup will appear with your Client ID and Client Secret. Click the **Download JSON** button.
7. Rename the downloaded file to exactly `credentials.json` and place it in this folder next to the Python script.

### 3. Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Create API Key**.
3. Copy the generated key.
4. Rename the `.env.example` file to `.env` in the folder.
5. Open the `.env` file and replace `"your_api_key_here"` with your actual API key.

## Execution Workflow

Once you have your `credentials.json` and `.env` files in the folder, open your terminal (PowerShell), and activate your virtual environment:

```powershell
.\venv\Scripts\activate
```

### Step 1: Run the Script
Run the main script to process all jobs from your `linkedin_job_data_*.json` file. It will progressively save the results to `job_application_status.csv`. If it hits a quota limit, it will automatically pause and wait for the limit to reset before seamlessly continuing.

```powershell
python check_job_status.py
```

> [!TIP]
> The very first time you run the script, your web browser will open and ask you to log into your Google account to grant the script permission to read your emails. Google will show a warning saying "Google hasn't verified this app" — this is normal because you just created it yourself. Click **Advanced**, then click **Go to [App Name] (unsafe)**, and click **Continue**.

If you need to stop the script, you can do so safely! Because it saves progressively, you can simply run `python check_job_status.py` again, and it will automatically skip any jobs it has already completed and resume where it left off.

### Step 2: Finding Old Recruiter Contacts (Optional)
If you want to follow up on older applications that have been sitting in the "not received a response" status, you can extract direct contact info for the recruiters! 

Run the recruiter finder script, which automatically compares your completed CSV with your original JSON data to isolate jobs applied to >10 days ago that have valid recruiter emails or profiles.

```powershell
python find_recruiters.py
```
This will generate a clean `old_applications_recruiters.csv` file that you can use to send out follow-up emails!
