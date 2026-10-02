# Send One-Click Confirmation Email to RSVPed Participants Task Specification

## Basic Information

- **Task ID:** T2
- **Task name:** Send One-Click Confirmation Email to RSVPed Participants
- **Task type:** Act
- **Task owner:** RSVP Sentinel; the CPVC Event Planner is accountable.

## 1. Task Description

T2 asks each active registrant, once, whether they still plan to attend, and then summarizes the answers received so far. Live answers are the best evidence of real turnout, but repeated messages would break the system's promise not to over-communicate, so T2 follows fixed rules. It emails a registrant only when the Confirmation Log has no sent record for that registrant and event. Each email contains two one-click links ("Yes, I'm coming" and "No, I can't make it") that open a one-question Google Form prefilled with the registrant ID and event ID. On every run, T2 also matches new form answers to registrants and recalculates the response summary.

The response rate is the number of registrants who answered divided by the number whose request was sent at least 24 hours before this run. The rate is "normal" at 30% or more and "low" below 30%. On the first run, when no request is 24 hours old, the rate is "low." If the summary cannot be produced, the rate is "unavailable." A low or unavailable rate sends the workflow to T4: Apply Historical Base Rate. T2 sends no reminders or follow-ups and no text messages.

## 2. Inputs

### Input 1

- **Input name:** Current registration snapshot
- **Contents and format:** Structured record: run ID, event ID, active registrant list (registrant ID, email address, registration timestamp), and active registrant count.
- **Source:** T1: Retrieve Current Registration Data.

### Input 2

- **Input name:** Confirmation log
- **Contents and format:** Table in the Confirmation Log tab: event ID, registrant ID, send status (sent, failed, or unknown), send time, Gmail message ID, response (yes, no, or pending), and response time.
- **Source:** Confirmation Log tab of the RSVP Sentinel workbook, written by this task on earlier runs.

### Input 3

- **Input name:** Confirmation form responses
- **Contents and format:** Table of one-click Google Form answers in the Confirmation Responses tab: registrant ID, event ID, answer (yes or no), and submission time.
- **Source:** Confirmation Google Form, submitted by registrants.

- **If a required input is missing or invalid:** If the Current registration snapshot is missing, T2 does not run; T1's failure has already gone to H1: Resolve Registration Data Issue. If the Confirmation Log cannot be read, T2 sends no emails in this run (so no one is emailed twice), sets the response rate to "unavailable," and notifies the CPVC Event Planner. A form answer whose registrant ID does not match an active registrant is kept but not counted, and is listed for the CPVC Event Planner. If a registrant answers more than once, the latest answer counts.

## 3. Outputs

### Output 1

- **Output name:** Confirmation response data
- **Contents and format:** Structured record: run ID, event ID, requests sent (total and this run), confirmed yes, confirmed no, pending, response rate, response rate status (normal, low, or unavailable), response timestamps relative to send time, and counts of failed or unknown sends.
- **Next task or recipient:** T3: Combine Confirmation Data with Historical Attendance Rate when the status is normal; T4: Apply Historical Base Rate when the status is low or unavailable. T5: Compute Predicted Attendance and Confidence Range also reads the yes and no counts.
- **Complete when:** The yes, no, and pending counts add up to the number of requests sent; the status follows the 30% rule; and any failed or unknown sends are counted, not treated as pending answers.

### Output 2

- **Output name:** Confirmation send record
- **Contents and format:** One row per registrant in the Confirmation Log tab: event ID, registrant ID, send status, send time, and Gmail message ID.
- **Next task or recipient:** Confirmation Log tab of the RSVP Sentinel workbook, which T2 reads on later runs to avoid resending.
- **Complete when:** Every registrant emailed in this run has exactly one row, and every row with status "sent" has a Gmail message ID.

## 4. Planned Tools

### Tool 1

- **Tool name:** `send_confirmation_email`
- **Input:** Current registration snapshot; Confirmation log.
- **Output:** Confirmation send record.
- **Implementation Route:** Web API calls; Gmail API send from the CPVC club account, plus Google Sheets API writes to the Confirmation Log tab.
- **Integration approach:** Direct integration.
- **Role in this task:** For each active registrant with no sent row, writes a "sending" row keyed by event ID and registrant ID, sends one email whose subject includes a unique confirmation code built from the event ID and registrant ID, then updates the row to "sent" with the Gmail message ID. It cannot send to anyone outside the active registrant list.
- **Task timeout:** 5 minutes for one task run, including retries; each send may take at most 10 seconds.
- **Maximum retries:** 1
- **Retry only when:** Each email may be retried once. Retry only when Gmail returns a temporary error, and a search of the club account's Sent folder for that registrant's confirmation code finds no message. Wait 5 seconds before the retry. If the Sent folder shows the message was sent, record it as sent and do not retry. If the Sent folder cannot be checked, do not retry.
- **On timeout, exhausted retries, or an error that cannot be retried:** Mark that registrant's row "failed" when the Sent folder confirms no message, or "unknown" when it cannot be confirmed. Do not resend "unknown" rows on later runs until the CPVC Event Planner clears them. Report failed and unknown counts in Confirmation response data. If Gmail authentication or quota fails for the whole run, stop sending, set the response rate status to "unavailable," and notify the CPVC Event Planner. Do not count unsent registrants as pending answers.

### Tool 2

- **Tool name:** `record_confirmation_responses`
- **Input:** Confirmation form responses; Confirmation log; Current registration snapshot.
- **Output:** Confirmation response data.
- **Implementation Route:** Web API calls; Google Sheets API reads of the Confirmation Responses tab and writes of the response fields in the Confirmation Log tab, plus functions/scripts that calculate the counts, rate, and status.
- **Integration approach:** Direct integration.
- **Role in this task:** Matches each form answer to its registrant's row, updates the response and response time, and returns the response summary with its normal, low, or unavailable status.
- **Task timeout:** 30 seconds for one task run, including retries.
- **Maximum retries:** 1
- **Retry only when:** A temporary Google Sheets API error prevents a read or write. Wait 5 seconds. Each registrant's response fields are overwritten in place with the latest answer, so a retry cannot create duplicate rows.
- **On timeout, exhausted retries, or an error that cannot be retried:** Set the response rate status to "unavailable," record the failure and attempts in Confirmation response data, and notify the CPVC Event Planner. The workflow continues through T4: Apply Historical Base Rate with the missing confirmation data flagged, so the forecast relies on history and says so. Do not report a normal response rate from incomplete data.
