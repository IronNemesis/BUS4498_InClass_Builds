# Retrieve Current Registration Data Task Specification

## Basic Information

- **Task ID:** T1
- **Task name:** Retrieve Current Registration Data
- **Task type:** Retrieve
- **Task owner:** RSVP Sentinel; the CPVC Event Planner is accountable.

## 1. Task Description

T1 starts every workflow run. It reads the current RSVP list and this event's details from the RSVP Sentinel Google Sheets workbook and hands a clean snapshot to the rest of the workflow. The forecast is only as good as the registration count it starts from, so T1 applies fixed rules instead of judgment: a registrant is active when they have a registration row for this event and have not canceled; duplicate registrations with the same email address count once, using the earliest registration; and rows with no email address are listed as invalid rather than counted. T1 also passes along the event context (date, type, and known scheduling conflicts) that T3 uses to judge whether historical patterns apply. T1 does not contact anyone or change any registration record.

## 2. Inputs

### Input 1

- **Input name:** Registration responses
- **Contents and format:** Table of RSVP Google Form responses in the Registrations tab: registrant ID, name, email address, registration timestamp, event ID, and cancellation flag.
- **Source:** RSVP Google Form, linked to the Registrations tab of the RSVP Sentinel workbook.

### Input 2

- **Input name:** Event details
- **Contents and format:** Structured record in the Event Details tab: event ID, event name, event type, event date and time, registration open date, known scheduling conflicts (holidays, exam periods, competing campus events), and the CPVC Event Planner's email address.
- **Source:** CPVC Event Planner, who maintains the Event Details tab.

### Input 3

- **Input name:** Run trigger
- **Contents and format:** Structured record: run ID, trigger type (scheduled or manual), and trigger time.
- **Source:** Workflow trigger (the 24-hour and 48-hour schedule, or a manual start by the CPVC Event Planner).

- **If a required input is missing or invalid:** If the Registrations tab or Event Details tab cannot be read, or the Event Details record is missing the event ID or event date, T1 stops with status "Retrieval failed" and the case goes to H1: Resolve Registration Data Issue. No forecast is produced from missing data. Individual invalid registration rows (for example, a missing email address) do not stop the run; they are excluded from the count and listed in the snapshot.

## 3. Outputs

### Output 1

- **Output name:** Current registration snapshot
- **Contents and format:** Structured record: run ID, event ID, retrieval time, active registrant list (registrant ID, email address, registration timestamp), active registrant count, canceled count, duplicate count, and invalid rows with reasons.
- **Next task or recipient:** T2: Send One-Click Confirmation Email to RSVPed Participants; the active registrant count is also used by T5: Compute Predicted Attendance and Confidence Range.
- **Complete when:** Every row in the Registrations tab for this event has been classified as active, canceled, duplicate, or invalid, and the active count equals the length of the active registrant list.

### Output 2

- **Output name:** Event context metadata
- **Contents and format:** Structured record: event ID, event date, event type, and known scheduling conflicts or anomalies, copied from the Event Details tab with its last-updated time.
- **Next task or recipient:** T3: Combine Confirmation Data with Historical Attendance Rate; T4: Apply Historical Base Rate uses the event type to select comparable past events.
- **Complete when:** The record includes the event ID, event date, and event type; an empty conflicts field is recorded as "none listed," not as missing.

### Output 3

- **Output name:** Retrieval failure report
- **Contents and format:** Structured record produced only on failure: run ID, the tab that could not be read or the missing required field, failure category, number of attempts, and time of failure.
- **Next task or recipient:** H1: Resolve Registration Data Issue (CPVC Event Planner).
- **Complete when:** The report names the exact tab or field that failed and is saved to the Issues tab.

## 4. Planned Tools

### Tool 1

- **Tool name:** `retrieve_registration_data`
- **Input:** Registration responses; Event details; Run trigger.
- **Output:** Current registration snapshot; Event context metadata; Retrieval failure report.
- **Implementation Route:** Web API calls; read-only Google Sheets API access to the Registrations and Event Details tabs, plus functions/scripts that apply the active, canceled, duplicate, and invalid rules. The only write is a failure report to the Issues tab.
- **Integration approach:** Direct integration.
- **Role in this task:** Reads this event's registration rows and event record, applies the fixed classification rules, and returns the snapshot and event context. It cannot edit or delete registration rows.
- **Task timeout:** 30 seconds for one task run, including retries.
- **Maximum retries:** 2
- **Retry only when:** A temporary Google Sheets API error or rate limit prevents a read. Wait 5 seconds before each retry. Do not retry denied access, a missing tab, or a missing required field. Reads do not change records, so retries cannot create duplicates.
- **On timeout, exhausted retries, or an error that cannot be retried:** Set status to "Retrieval failed," save the Retrieval failure report to the Issues tab, and hand the case to H1: Resolve Registration Data Issue. Do not pass a partial registrant list to T2 or treat a failed read as zero registrants.
