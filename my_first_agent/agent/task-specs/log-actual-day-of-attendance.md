# Log Actual Day-Of Attendance Task Specification

## Basic Information

- **Task ID:** T11
- **Task name:** Log Actual Day-Of Attendance
- **Task type:** Remember
- **Task owner:** RSVP Sentinel; the CPVC Event Planner is accountable.

## 1. Task Description

T11 runs 24 hours after the event ends. It counts actual attendance from the day-of check-in form, compares it with the final forecast, and adds this event to the Event History tab so future forecasts learn from it. Attendees check in at the door by scanning a QR code to a Check-In Google Form; the rules are fixed. Each unique email address counts once, including walk-ins who did not register. Accuracy uses the system goal's measure: the smaller of the final forecast and actual attendance, divided by the larger. If an override was finalized, T11 also calculates the system forecast's accuracy so the two can be compared. The workflow needs T11 to measure progress toward the 80% accuracy target and to keep the historical rate current for T3 and T4.

## 2. Inputs

### Input 1

- **Input name:** Check-in records
- **Contents and format:** Table in the Check-Ins tab: event ID, email address, registrant ID when matched, walk-in flag, and check-in time.
- **Source:** Check-In Google Form, submitted by attendees at the door.

### Input 2

- **Input name:** Final forecast record
- **Contents and format:** The Final Forecasts tab row flagged "current" for this event: final predicted attendance, source (approved or overridden), and run ID.
- **Source:** T9: Finalize Forecast and Purchase Recommendations.

### Input 3

- **Input name:** Override record
- **Contents and format:** Overrides tab row for the final run ID, when one exists: system predicted attendance and override predicted attendance.
- **Source:** T10: Log Organizer Override.

### Input 4

- **Input name:** Current registration snapshot
- **Contents and format:** Active registrant count from the last run before the event.
- **Source:** T1: Retrieve Current Registration Data.

- **If a required input is missing or invalid:** If the Check-Ins tab is empty or unreadable, T11 does not record zero attendance; it stops with status "Attendance not counted" and escalates to the CPVC Event Planner to supply a head count. If no final forecast exists for the event, T11 records attendance in the Event History tab but marks accuracy "not measurable: no final forecast." A missing override record is normal when the forecast was approved.

## 3. Outputs

### Output 1

- **Output name:** Actual attendance record
- **Contents and format:** Row in the Event History tab: event ID, event name, event type, event date, registrations, actual attendance, walk-ins, and attendance rate (actual attendance, including walk-ins, divided by registrations; the same attendance-to-registration rate as the README baseline).
- **Next task or recipient:** Event History tab, read by T3: Combine Confirmation Data with Historical Attendance Rate and T4: Apply Historical Base Rate on future events.
- **Complete when:** Exactly one Event History row exists for the event ID, with a whole-number attendance count and a rate between 0% and 100%.

### Output 2

- **Output name:** Forecast accuracy result
- **Contents and format:** Structured record: event ID, final forecast, actual attendance, accuracy, whether the 80% target was met, and system-forecast accuracy when an override was used.
- **Next task or recipient:** CPVC Event Planner; this completes the optional Forecast Accuracy Evaluated step.
- **Complete when:** The accuracy value uses the smaller-divided-by-larger formula and is saved with the event's Event History row.

## 4. Planned Tools

### Tool 1

- **Tool name:** `record_actual_attendance`
- **Input:** Check-in records; Final forecast record; Override record; Current registration snapshot.
- **Output:** Actual attendance record; Forecast accuracy result.
- **Implementation Route:** Web API calls; Google Sheets API reads of the Check-Ins, Final Forecasts, and Overrides tabs and an insert-or-replace write to the Event History tab, plus functions/scripts that count unique check-ins and calculate accuracy.
- **Integration approach:** Direct integration.
- **Role in this task:** Counts unique check-ins, calculates accuracy, and writes one Event History row keyed by event ID. It cannot edit check-in or forecast records.
- **Task timeout:** 30 seconds for one task run, including retries.
- **Maximum retries:** 2
- **Retry only when:** A temporary Google Sheets API error occurs. Wait 10 seconds and read back the Event History row for this event ID first; if it already matches, do not write again. The row is keyed by event ID and replaced in place, so a retry cannot create a duplicate history entry.
- **On timeout, exhausted retries, or an error that cannot be retried:** Set status to "Failed," record the failure and attempts, and escalate to the CPVC Event Planner. Do not add a partial or unconfirmed row to Event History, because future forecasts would learn from it.
