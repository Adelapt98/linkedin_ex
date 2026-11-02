# Application-status analysis companion

This optional Python companion helps review messages associated with a job search. It takes a job-data export from the extension, searches the connected Gmail inbox for company-related messages, and uses Google's Gemini API to estimate whether a response is a rejection, an interview invitation, or no useful response.

It is a separate experiment, not part of the installed browser extension. Bringing useful status review and follow-up drafting into the dashboard is a longer-term goal described in the [roadmap](../ROADMAP.md).

## Data flow and privacy

1. Read a local job-data export.
2. Request Gmail read access through a Google OAuth desktop client configured by the user.
3. Search the connected account and read selected message bodies.
4. Send selected email text, company name, and job title to Gemini for classification.
5. Write status results to local CSV and update the input JSON.

**This workflow is not entirely local.** Even messages received in your own inbox can contain other people's names, addresses, signatures, or confidential information. Selected bodies leave your computer when sent to Gemini. Do not use a live inbox in a shared development session unless its data handling is explicitly permitted.

Keep exports and credentials private. Develop with invented jobs/messages and mocked Gmail/model responses. Provider model access, quotas, and prices can change, so a permanently free service is not guaranteed.

## Files

| File | Purpose |
| --- | --- |
| `check_job_status.py` | Gmail lookup, model classification, progressive CSV output, and input JSON updates |
| `find_recruiters.py` | Cross-references CSV company/title pairs against older saved records with contact fields |
| `requirements.txt` | Current dependency list, which needs the SDK correction described below |
| `.env.example` | Placeholder for the Gemini API key |
| `linkedin_job_data.json.example` | A sample record structure, not a real input required for installation |

## Setup

Run these commands from the `analyze jobs/` folder. Use a fresh Python virtual environment rather than copying an existing environment between computers.

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt google-genai
```

The additional `google-genai` package is necessary because the code imports `from google import genai`, while the checked-in requirements currently list the different `google-generativeai` package. The [Google Gen AI SDK documentation](https://googleapis.github.io/python-genai/) describes the package used by this import. Correcting the requirements and verifying a fresh installation are still pending.

### Gmail access

Create and configure a Google OAuth desktop client for the Gmail API through the [Google Cloud Console](https://console.cloud.google.com/), following Google's current consent instructions. If your client uses test mode, add the intended account as an authorized test user where required.

Download that client's configuration as `credentials.json` into this folder. On first authorized execution, the script opens a browser consent flow and creates `token.json`. Understand and verify the client requesting access; do not bypass an unexpected warning for an unfamiliar app.

The requested scope is `gmail.readonly`. The code does not send email. `token.json` contains sensitive OAuth credentials and must not be committed, included in a shared archive, or used as a fixture.

### Gemini access

Create an API key through [Google AI Studio](https://aistudio.google.com/app/apikey), then copy the example configuration:

```powershell
Copy-Item .env.example .env
```

Set `GEMINI_API_KEY` in your private `.env` file. Do not paste the key into source code, issues, screenshots, or application forms.

### Input data

The checker expects a file named `linkedin_job_data.json` in its working directory. The extension exports timestamped JSON filenames, so rename a private working copy to this exact name. Preserve a backup because the checker overwrites that JSON as it progresses.

For a permitted private run, use your own authorized data. For shared development and tests, use deliberately fictional data and mocked services. The checked-in `.example` file demonstrates the shape only; it is not evidence of an actual application.

## Run the checker

```powershell
python check_job_status.py
```

The script selects records marked `saved: true` with usable company names, searches Gmail using a three-month query (`newer_than:3m`), and processes up to 15 bodies from the returned message list. It truncates combined message text to 30,000 characters before calling the hard-coded `gemini-2.5-flash-lite` model.

It appends results to `job_application_status.csv` and updates `linkedin_job_data.json` with `status` and `emailsFound` fields.

Possible classifications are:

- `rejected`
- `interview`
- `not received a response`

The last category includes acknowledgments, promotional messages, and messages judged unrelated. It does not necessarily mean that no email was received. Saved jobs are not verified applications, so check the results against applications you actually submitted.

## Current limitations

- The prompt says one month, but the actual Gmail query requests three months.
- Company-name and first-word searches can mix different roles or unrelated messages. Application-specific matching is not implemented.
- Gmail message-list pagination is missing, and lookup errors can be treated as empty results.
- Model quota retries have no limit, so persistent failures can keep a run waiting indefinitely.
- Non-error company/title combinations already in the CSV are skipped on subsequent runs. Later interview or rejection messages will not automatically refresh those statuses.
- Input/output filenames and the model identifier are hard-coded.
- The source JSON is overwritten without a backup or atomic-write protocol.

Review classifications manually. Progressive output helps retain results, but it does not establish that every status is complete, current, or correct.

## Recruiter-contact export

```powershell
python find_recruiters.py
```

This helper currently expects `job_application_status_backup.csv`, not the checker's output filename. It also reads `linkedin_job_data.json` and writes `old_applications_recruiters.csv`.

It selects saved records whose `dateSaved` is older than ten days, which appear in the CSV's company/title pairs, and have recruiter-name or email fields. It does **not** filter the CSV `Status` field for unanswered applications. Its output labels a saved date as Date Applied even though the extension does not verify an application date.

Treat the helper as experimental. Do not interpret its output as a verified unanswered-application list. It does not draft or send messages.

## Repository hygiene

Keep `.env`, OAuth credentials/tokens, real job JSON exports, CSV outputs, and virtual environments out of source control. The current ignore rules cover several credential names and CSV files but do not yet cover `linkedin_job_data.json` or `venv/`; add those exclusions before using real data locally. Ignoring files does not remove earlier committed copies or revoke exposed credentials.

## License

Original companion code uses the repository's [MIT license](../LICENSE). That license does not grant rights to disclose or redistribute other people's messages, personal information, or job descriptions.
