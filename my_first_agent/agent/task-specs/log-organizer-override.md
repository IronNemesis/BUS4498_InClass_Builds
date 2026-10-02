# Log Organizer Override Task Specification

## Basic Information

- **Task ID:** T10
- **Task name:** Log Organizer Override
- **Task type:** Remember
- **Task owner:** RSVP Sentinel; the CPVC Event Planner is accountable.

## 1. Task Description

When the CPVC Event Planner overrides a forecast in H3, T10 records what the system predicted, what the Event Planner chose instead, and why. The workflow needs this record for two reasons: T9 must finalize the Event Planner's numbers rather than the system's, and after the event T11 can compare both numbers to actual attendance to show whether overrides improve accuracy. The rule is fixed: one override record per run ID, copied exactly from the Review Decisions tab and the Forecasts tab. T10 does not judge whether the override is reasonable.

## 2. Inputs

### Input 1

- **Input name:** Override decision
- **Contents and format:** Review Decisions tab row: run ID, decision "override," override predicted attendance, reason, reviewer, and time.
- **Source:** H3: Review Forecast and Purchase Recommendations.

### Input 2

- **Input name:** Attendance forecast
- **Contents and format:** This run's Forecasts tab row: predicted attendance, low and high ends of the range, and purchase recommendations.
- **Source:** T5: Compute Predicted Attendance and Confidence Range and T6: Generate Recommended Food and Drink Quantities.

- **If a required input is missing or invalid:** If the override decision lacks a whole-number attendance or a reason, T10 does not log it and asks the CPVC Event Planner to resubmit through H3. If this run's forecast row cannot be read, T10 stops with status "Failed" and escalates to the CPVC Event Planner. T9 does not run until the override is logged.

## 3. Outputs

### Output 1

- **Output name:** Override record
- **Contents and format:** Row in the Overrides tab: run ID, event ID, system predicted attendance and range, override predicted attendance, difference, reason, reviewer, and time.
- **Next task or recipient:** T9: Finalize Forecast and Purchase Recommendations; T11: Log Actual Day-Of Attendance reads it after the event.
- **Complete when:** Exactly one row exists for the run ID and it matches both the Review Decisions and Forecasts values.

## 4. Planned Tools

### Tool 1

- **Tool name:** `log_forecast_override`
- **Input:** Override decision; Attendance forecast.
- **Output:** Override record.
- **Implementation Route:** Web API calls; Google Sheets API reads of the Review Decisions and Forecasts tabs and an insert-or-replace write to the Overrides tab.
- **Integration approach:** Direct integration.
- **Role in this task:** Copies the override and the original forecast into one Overrides row keyed by run ID. It cannot change the forecast or the decision.
- **Task timeout:** 15 seconds for one task run, including retries.
- **Maximum retries:** 1
- **Retry only when:** A temporary Google Sheets API error occurs. Wait 5 seconds and read back the Overrides row for this run ID first; if it already matches, do not write again. The row is keyed by run ID and replaced in place, so a retry cannot create a duplicate.
- **On timeout, exhausted retries, or an error that cannot be retried:** Set status to "Failed," record the failure and attempts, and escalate to the CPVC Event Planner. T9 does not finalize the overridden numbers until the override record is confirmed.
