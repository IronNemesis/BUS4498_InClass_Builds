# Package Forecast and Recommendations into Report Task Specification

## Basic Information

- **Task ID:** T7
- **Task name:** Package Forecast and Recommendations into Report
- **Task type:** Reason
- **Task owner:** RSVP Sentinel; the CPVC Event Planner is accountable.

## 1. Task Description

T7 turns the forecast, shopping list, and weighting justification into one short report the CPVC Event Planner can review in a few minutes. A fixed report template holds every number (predicted attendance, range, response counts, and purchase quantities), copied directly from T5 and T6. A model-supported operation drafts a plain-language summary of at most 150 words explaining what drove the forecast and any data-quality flags, such as a low response rate or the 40% default. The model receives only this run's forecast, recommendations, justification, and flags, with no participant names or email addresses. After drafting, a fixed check compares every number in the summary to the source values. The model cannot change any number in the report. The workflow needs T7 so the human review in H3 is fast and based on clear evidence.

## 2. Inputs

### Input 1

- **Input name:** Attendance forecast
- **Contents and format:** Structured record: run ID, predicted attendance, low and high ends of the range, rates, weights, and weighting source.
- **Source:** T5: Compute Predicted Attendance and Confidence Range.

### Input 2

- **Input name:** Purchase recommendations
- **Contents and format:** Structured record: each item's quantity, unit, rate, and forecast value used.
- **Source:** T6: Generate Recommended Food and Drink Quantities.

### Input 3

- **Input name:** Weighting justification
- **Contents and format:** Text and evidence summary explaining the chosen weighting, from this run's Weighting Decisions row.
- **Source:** T3: Combine Confirmation Data with Historical Attendance Rate, or H2: Set Weighting Manually.

### Input 4

- **Input name:** Data quality flags
- **Contents and format:** List of flags for this run: response rate status, failed or unknown email sends, use of the 40% default, and invalid registration rows.
- **Source:** T1: Retrieve Current Registration Data, T2: Send One-Click Confirmation Email to RSVPed Participants, and T4: Apply Historical Base Rate.

- **If a required input is missing or invalid:** If the forecast or purchase recommendations are missing, T7 does not run and the case is escalated to the CPVC Event Planner. A missing weighting justification or empty flags list does not stop the report; the report states "justification not available" or "no flags."

## 3. Outputs

### Output 1

- **Output name:** Forecast report
- **Contents and format:** Email-ready report saved to the Reports tab with run ID: subject line with event name and run ID; numbers section (predicted attendance, range, response counts, purchase quantities with calculations); plain-language summary, or the label "Summary unavailable" if it failed its check; data quality flags; and a link to the Review Google Form prefilled with the run ID.
- **Next task or recipient:** T8: Send Report to Organizers for Review.
- **Complete when:** Every number in the report matches T5 and T6 exactly, the review link includes the run ID, and the report is saved in the Reports tab.

## 4. Planned Tools

### Tool 1

- **Tool name:** `draft_forecast_summary`
- **Input:** Attendance forecast; Purchase recommendations; Weighting justification; Data quality flags.
- **Output:** Forecast report (plain-language summary section).
- **Implementation Route:** Web API calls; Groq API with model `openai/gpt-oss-120b`, using a key stored outside the repository.
- **Integration approach:** Direct integration.
- **Role in this task:** Drafts a summary of at most 150 words from the supplied values only. It returns text and cannot change numbers, send messages, or write records.
- **Task timeout:** 60 seconds for one task run, including retries; each request may take at most 20 seconds.
- **Maximum retries:** 1
- **Retry only when:** The Groq request fails with a temporary error or rate limit, or the draft fails the number check. Wait 5 seconds. A retry only produces new draft text, so it cannot duplicate records or messages.
- **On timeout, exhausted retries, or an error that cannot be retried:** Use the label "Summary unavailable" in place of the summary, add a data quality flag, and continue with the numbers-only report. The numbers section remains complete and checked, so the report is still usable for review. Do not include an unchecked summary.

### Tool 2

- **Tool name:** `assemble_forecast_report`
- **Input:** Attendance forecast; Purchase recommendations; Data quality flags; and the summary text returned by `draft_forecast_summary`.
- **Output:** Forecast report.
- **Implementation Route:** Functions/scripts that fill the fixed report template and compare every summary number to the source values, plus a Google Sheets API write (web API call) to the Reports tab.
- **Integration approach:** Direct integration.
- **Role in this task:** Builds the report, rejects any summary with a number that does not match, and saves one report row keyed by run ID.
- **Task timeout:** 15 seconds for one task run, including retries.
- **Maximum retries:** 1
- **Retry only when:** The Reports tab write fails with a temporary Google Sheets API error. Wait 5 seconds and read back this run's row first; the row is keyed by run ID and replaced in place, so a retry cannot create a duplicate report.
- **On timeout, exhausted retries, or an error that cannot be retried:** Set status to "Failed," record the failure and attempts, and escalate to the CPVC Event Planner. Do not pass an unsaved or unchecked report to T8.
