# Roadmap

The goal is to make APT LinkedIn Job Search a dependable job-search workspace: filter irrelevant listings, understand important requirements quickly, organize applications, and prepare better application materials.

The existing extension uses local rules. Optional model-powered tools and email integration are planned additions, not current extension capabilities. Estimates below are planning ranges for implementation and verification, not claims of work already completed.

## Milestone 1: dependable filtering and history

| Work | Estimate | Completion criteria |
| --- | --- | --- |
| Preserve saved-job records | 4 to 6 hours | Re-analysis in both page adapters merges new metadata without deleting the saved flag, description, saved date, or other existing details. Checks cover save, revisit, and repeated analysis. |
| Consistent storage updates | 4 to 6 hours | Define a shared record-update approach, handle errors, refresh open dashboards, and verify that concurrent saves/deletes do not lose unrelated changes. |
| Location preferences in the popup | 5 to 7 hours | Add/edit/remove country and city rules in one shared configuration. Match extracted locations rather than arbitrary card text. Explain why a result was hidden and allow it to be restored. |
| Safe imports and dashboard rendering | 5 to 7 hours | Validate file size, record types, IDs, field lengths, and URLs before changing storage. Render text safely, reject unsafe links, and preview merge conflicts. Invalid imports leave existing data intact. |
| Reliable navigation and job identity | 4 to 6 hours | Parse path and query-based IDs consistently. Handle delayed descriptions, rapid navigation, timeouts, and recycled cards without attaching information to the wrong job. |
| Clearer language and sponsorship signals | 4 to 6 hours | Share detection rules across adapters. Distinguish explicit denial, existing-authorization wording, positive sponsorship evidence where reliable, and unknown status. Cover optional languages, mixed text, negation, and relocation wording. |
| Regression runner and CI | 5 to 7 hours | Commit an assertion-based suite using invented page/message fixtures. One command checks both adapters, storage, popup, and dashboard; CI runs it on each change. |
| Export and retention controls | 3 to 5 hours | Preserve raw descriptions, escape CSV once, neutralize spreadsheet formula prefixes, add retention controls, and surface quota/download failures. |
| Reproducible release and documentation | 3 to 5 hours | Generate the package from current source, document permissions, use fictional screenshots/examples and original assets, and verify installation from a fresh checkout. |

**Proposed first-milestone total: 37 to 55 hours.** Individual items include their own focused verification. The regression-runner item covers shared fixtures, tooling, and broader cross-component coverage rather than counting those checks again.

Start with saved-record preservation, storage consistency, and safe imports. These protect the data needed by later features.

## Milestone 2: an application dashboard

- [ ] Separate **viewed**, **saved**, and **applied** states. Add explicit application dates and a manual status timeline instead of treating a saved date as an application date.
- [ ] Add company-name search and filters for status, tags, date range, and location.
- [ ] Add keyword/company exclusion rules with a visible reason and an undo option.
- [ ] Add salary and employment-type signals, preserving unknown values when the advertisement provides no usable information.
- [ ] Add bulk selection, tagging, deletion, and selective export.
- [ ] Add user-configured reminders based on application or follow-up dates.
- [ ] Improve keyboard navigation, accessible labels, sortable headers, modal focus, and large-history performance.
- [ ] Add theme preferences and a compact dashboard view.
- [ ] Offer a metadata-only mode with a clear migration path. Consider descriptions, imports, exports, and previously stored records, not only dedicated contact fields.

## Milestone 3: optional resume-to-job matching

- [ ] Add a section where the user can supply their own resume and matching preferences.
- [ ] Start with a documented provider integration and an adapter interface for additional providers, rather than promising immediate compatibility with every LLM.
- [ ] Make matching available when a job is opened, with clear controls for whether a model request is triggered automatically or manually.
- [ ] Show evidence-based matches, gaps, and uncertainties linked to the resume and job wording. A score should explain its basis rather than imply a hiring prediction.
- [ ] Keep local regex badges usable when model access is disabled, unavailable, or rate-limited.
- [ ] Show exactly what resume/job text will be transmitted and require user opt-in before transmission. Handle API credentials locally without committing or including them in exports.
- [ ] Support an optional user-provided local endpoint if feasible, without turning this project into model training, benchmarking, or serving infrastructure.

The intention is to reduce repeated comparison work while keeping the user in control. A free provider tier or a locally available model may be an option, but availability, hardware needs, quotas, and costs must be explained accurately.

## Milestone 4: integrate application-status review

The Python companion currently runs outside the browser. The longer-term plan is to bring useful status review into the dashboard.

- [ ] First support manual status updates and notes, without inbox access.
- [ ] Explore an optional, explicitly authorized Gmail integration that explains its access scope and transmission of message content.
- [ ] Match messages to a specific application and date, not just a company keyword.
- [ ] Show the source and date supporting each status, allow correction, and distinguish no matching email from lookup failure or an acknowledgment.
- [ ] Refresh statuses when later replies arrive and provide bounded retries, cancellation, and pagination.
- [ ] Draft follow-up emails or messages for user review when an application has no useful response after a chosen interval.
- [ ] Keep any sending action separate from drafting and require an explicit user action. Resolve platform/API permission requirements before adding direct sending.

Email and recruiter-contact workflows process other people's information. They need a deliberate privacy design and separate eligibility clarification for any program that excludes that processing.

## Milestone 5: cover letters and resume refinement

- [ ] Generate an editable cover-letter draft for a selected job using the user's supplied background.
- [ ] Suggest resume wording and structure changes tied to the role's actual requirements.
- [ ] Do not invent qualifications, experience, or application outcomes. Let the user compare suggestions before applying them.
- [ ] Reuse the optional provider controls, transmission preview, cancellation, and error handling from resume matching.
- [ ] Keep the extension free to install while explaining any provider costs. Do not promise permanently free model usage.

## Companion repairs before integration

- [ ] Correct `requirements.txt` to declare the SDK used by `from google import genai`; verify setup in a fresh environment.
- [ ] Make input/output paths, model choice, and Gmail lookback explicit options. Align the prompt with the actual lookback.
- [ ] Preserve source data with backups or atomic writes rather than overwriting an input without protection.
- [ ] Refresh completed statuses instead of skipping non-error results indefinitely.
- [ ] Handle retrieval failures separately from no response, implement message pagination, and cap retries.
- [ ] Fix the recruiter export's backup-CSV dependency and missing status filter. Use the real application date once available, not `dateSaved` as a substitute.
- [ ] Validate classification output strictly and test misleading or instruction-like email text using invented messages.

## Maintenance and publication

- [ ] Extract shared heuristics, date parsing, location preferences, and storage logic; keep page-specific selectors in adapters.
- [ ] Add storage-schema definitions and migrations before considering a broader TypeScript conversion.
- [ ] Commit the regression harness rather than excluding test files through `.gitignore`.
- [ ] Ignore real `linkedin_job_data.json` exports and virtual environments; retain only deliberately fictional fixtures.
- [ ] Replace the copied advertisement in `test_lang.js`, including its named contact, with authored multilingual fixtures.
- [ ] Use reserved example URLs in sample records instead of plausible live profile/job links.
- [ ] Audit unnecessary `tabs` permission and web-accessible resources exposed to `<all_urls>`.
- [ ] Regenerate or remove the stale tracked extension ZIP. Its current contents still include removed logo assets.
- [ ] Add a changelog, architecture/data-flow notes, issue templates, and a reproducible packaging command.
- [ ] Confirm the scope permitted by any participation program before submission, including optional email and model integrations.
