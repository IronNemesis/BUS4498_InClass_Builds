# Send Report to Organizers for Review Task Specification

## Basic Information

- **Task ID:** T8
- **Task name:** Send Report to Organizers for Review
- **Task type:** Act
- **Task owner:** RSVP Sentinel; the CPVC Event Planner is accountable.

## 1. Task Description

T8 emails this run's forecast report to the CPVC Event Planner, the organizer responsible for approving it, and starts the 24-hour review clock for H3. Human review is required before anything is finalized, so the report must arrive exactly once per run. The fixed rule is one report email per run ID: T8 checks the Reports tab for an existing send record before sending, and the subject line includes the run ID so the club account's Sent folder can confirm whether a send happened. T8 sends only to the Event Planner's address in the Event Details tab and never to participants.

## 2. Inputs

### Input 1

- **Input name:** Forecast report
- **Contents and format:** Email-ready report from the Reports tab: subject with event name and run ID, numbers section, summary or "Summary unavailable," data quality flags, and the prefilled Review Google Form link.
- **Source:** T7: Package Forecast and Recommendations into Report.

### Input 2

- **Input name:** Event Planner contact
- **Contents and format:** The CPVC Event Planner's email address from the Event Details tab.
- **Source:** CPVC Event Planner, who maintains the Event Details tab.

- **If a required input is missing or invalid:** If the report is missing or the Event Planner's address is missing or invalid, T8 sends nothing, records status "Not sent," and the case stays with the CPVC Event Planner through the Issues tab. The forecast remains unreviewed and cannot be finalized.

## 3. Outputs

### Output 1

- **Output name:** Review request
- **Contents and format:** One email to the CPVC Event Planner containing the forecast report and the Review Google Form link, with the review deadline (24 hours after sending) stated at the top.
- **Next task or recipient:** H3: Review Forecast and Purchase Recommendations (CPVC Event Planner).
- **Complete when:** Gmail returns a message ID for the email and the send record below is saved.

### Output 2

- **Output name:** Report send record
- **Contents and format:** This run's Reports tab row updated with send status (sent, failed, or unknown), send time, Gmail message ID, and review deadline.
- **Next task or recipient:** Reports tab of the RSVP Sentinel workbook; H3 uses the review deadline.
- **Complete when:** The row shows status "sent" with a message ID and deadline, or shows "failed" or "unknown" with the reason.

## 4. Planned Tools

### Tool 1

- **Tool name:** `send_forecast_report`
- **Input:** Forecast report; Event Planner contact.
- **Output:** Review request; Report send record.
- **Implementation Route:** Web API calls; Gmail API send from the CPVC club account, and Google Sheets API read and write of this run's Reports tab row.
- **Integration approach:** Direct integration.
- **Role in this task:** Checks that no report for this run ID has already been sent, sends the report email to the Event Planner, and records the send status, message ID, and review deadline.
- **Task timeout:** 30 seconds for one task run, including retries.
- **Maximum retries:** 1
- **Retry only when:** Gmail returns a temporary error and a search of the Sent folder for this run ID finds no message. Wait 5 seconds. If the Sent folder shows the message was sent, record it as sent and do not retry. If the Sent folder cannot be checked, do not retry.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record status "failed" (confirmed not sent) or "unknown" (cannot confirm) in the Reports tab and escalate to the CPVC Event Planner. Do not start the review clock or treat an unconfirmed send as delivered; the forecast stays unreviewed and is not finalized.
