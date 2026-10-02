# Apply Historical Base Rate Task Specification

## Basic Information

- **Task ID:** T4
- **Task name:** Apply Historical Base Rate
- **Task type:** Decide
- **Task owner:** RSVP Sentinel; the CPVC Event Planner is accountable.

## 1. Task Description

T4 runs when confirmation data is too thin or unavailable to trust on its own. It selects the historical attendance rate that T3 should lean on, using a fixed rule instead of judgment. Comparable past events are CPVC events in the Event History tab with the same event type as this event. If at least one comparable event exists, the rate is the registration-weighted average (total actual attendees divided by total registrations) across comparable events. If none exist, the rule uses all CPVC past events. If the Event History tab is readable but empty, the rule uses the documented 40% default from CPVC's last build event and flags it. The workflow needs T4 so a low response rate produces a forecast grounded in history rather than in a handful of early answers.

## 2. Inputs

### Input 1

- **Input name:** Event history records
- **Contents and format:** Table in the Event History tab: event ID, event name, event type, event date, registrations, actual attendance, and attendance rate.
- **Source:** Event History tab of the RSVP Sentinel workbook, updated by T11: Log Actual Day-Of Attendance after each event.

### Input 2

- **Input name:** Event context metadata
- **Contents and format:** Structured record: event ID, event date, event type, and known scheduling conflicts.
- **Source:** T1: Retrieve Current Registration Data.

### Input 3

- **Input name:** Confirmation response data
- **Contents and format:** Structured record including the response rate and its status (low or unavailable), which is why T4 is running.
- **Source:** T2: Send One-Click Confirmation Email to RSVPed Participants.

- **If a required input is missing or invalid:** If the Event History tab cannot be read, T4 stops with status "Failed," does not substitute the 40% default, and escalates to the CPVC Event Planner; no forecast is produced from this run. A readable but empty tab is valid and triggers the documented 40% default with a flag. Past-event rows with missing registrations or attendance are skipped and listed.

## 3. Outputs

### Output 1

- **Output name:** Historical attendance rate
- **Contents and format:** Structured record: run ID, selected rate, rule applied (comparable events, all events, or 40% default), events used (event IDs and dates), sample size, date range, skipped rows, and the reason T4 ran (low or unavailable response rate).
- **Next task or recipient:** T3: Combine Confirmation Data with Historical Attendance Rate.
- **Complete when:** The record names one rule, one rate between 0% and 100%, and the events behind it, or states that the 40% default was used because no past events exist.

## 4. Planned Tools

### Tool 1

- **Tool name:** `apply_historical_base_rate`
- **Input:** Event history records; Event context metadata; Confirmation response data.
- **Output:** Historical attendance rate.
- **Implementation Route:** Web API calls; read-only Google Sheets API access to the Event History tab, plus functions/scripts that apply the fixed selection and averaging rule.
- **Integration approach:** Direct integration.
- **Role in this task:** Selects comparable past events, calculates the registration-weighted rate, and returns it with the rule and evidence used. It does not write records.
- **Task timeout:** 30 seconds for one task run, including retries.
- **Maximum retries:** 1
- **Retry only when:** A temporary Google Sheets API read error occurs. Wait 5 seconds. The tool is read-only, so a retry cannot create duplicate records.
- **On timeout, exhausted retries, or an error that cannot be retried:** Set status to "Failed," record the failure category and attempts, and escalate to the CPVC Event Planner. The run stops before T3. Do not pass an assumed rate to T3 when history could not be read.
