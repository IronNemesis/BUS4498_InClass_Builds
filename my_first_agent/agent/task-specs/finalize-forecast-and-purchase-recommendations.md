# Finalize Forecast and Purchase Recommendations Task Specification

## Basic Information

- **Task ID:** T9
- **Task name:** Finalize Forecast and Purchase Recommendations
- **Task type:** Remember
- **Task owner:** RSVP Sentinel; the CPVC Event Planner is accountable.

## 1. Task Description

T9 saves the reviewed forecast and shopping list as this run's final version, which is the version organizers buy from. If the Event Planner approved the forecast, T9 marks the system's numbers final. If the Event Planner overrode it, T9 recalculates the purchase quantities from the override attendance with the same rule T6 uses, then marks those numbers final. Only one final version exists per run ID, and a newer final version from a later run replaces an older one as the "current" plan. T9 does not place orders.

## 2. Inputs

### Input 1

- **Input name:** Approved forecast decision
- **Contents and format:** Review Decisions tab row with decision "approve," run ID, reviewer, and time.
- **Source:** H3: Review Forecast and Purchase Recommendations.

### Input 2

- **Input name:** Override record
- **Contents and format:** Overrides tab row: run ID, override predicted attendance, reason, and reviewer.
- **Source:** T10: Log Organizer Override.

### Input 3

- **Input name:** Attendance forecast
- **Contents and format:** This run's Forecasts tab row: predicted attendance, range, and purchase recommendations.
- **Source:** T5: Compute Predicted Attendance and Confidence Range and T6: Generate Recommended Food and Drink Quantities.

### Input 4

- **Input name:** Purchase rates
- **Contents and format:** Per-attendee rates and unit sizes from the Purchase Rates tab, used only when recalculating after an override.
- **Source:** CPVC Event Planner, who maintains the Purchase Rates tab.

- **If a required input is missing or invalid:** T9 requires either an approved forecast decision or a confirmed override record for the run ID. If neither exists, T9 does not run and the forecast stays not final. If both exist for the same run ID, T9 stops and asks the CPVC Event Planner which applies. If the forecast row or purchase rates cannot be read, T9 stops with status "Failed" and escalates to the CPVC Event Planner.

## 3. Outputs

### Output 1

- **Output name:** Final forecast record
- **Contents and format:** Row in the Final Forecasts tab: run ID, event ID, final predicted attendance, range (system range, or "not applicable" for an override), final purchase quantities with calculations, source (approved or overridden), reviewer, finalized time, and "current" flag.
- **Next task or recipient:** CPVC Event Planner, who buys from the current final record; T11: Log Actual Day-Of Attendance reads the last current record after the event.
- **Complete when:** Exactly one row exists for the run ID, only one row for the event is flagged "current," and its quantities match the approved or recalculated values.

## 4. Planned Tools

### Tool 1

- **Tool name:** `calculate_purchase_quantities`
- **Input:** Override record; Purchase rates.
- **Output:** Final forecast record (recalculated purchase quantities).
- **Implementation Route:** Web API calls; Google Sheets API read of the Purchase Rates tab, plus functions/scripts that apply the per-attendee rule. This is the same tool T6 uses.
- **Integration approach:** Direct integration.
- **Role in this task:** Runs only after an override, recalculating each item's quantity from the override attendance. It does not write the final record itself.
- **Task timeout:** 15 seconds for one task run, including retries.
- **Maximum retries:** 1
- **Retry only when:** A temporary Google Sheets API read error occurs. Wait 5 seconds. The calculation does not write records, so a retry cannot create duplicates.
- **On timeout, exhausted retries, or an error that cannot be retried:** Set status to "Failed," record the failure and attempts, and escalate to the CPVC Event Planner. Do not finalize an override without recalculated quantities.

### Tool 2

- **Tool name:** `finalize_forecast_record`
- **Input:** Approved forecast decision or Override record; Attendance forecast; and, after an override, the recalculated quantities returned by `calculate_purchase_quantities`.
- **Output:** Final forecast record.
- **Implementation Route:** Web API calls; Google Sheets API insert-or-replace write to the Final Forecasts tab, and an update that moves the "current" flag to this run's row.
- **Integration approach:** Direct integration.
- **Role in this task:** Saves one final row per run ID and marks it current. It cannot change the review decision or the source forecast.
- **Task timeout:** 15 seconds for one task run, including retries.
- **Maximum retries:** 1
- **Retry only when:** A temporary Google Sheets API write error occurs. Wait 5 seconds and read back the Final Forecasts tab first; if this run's row already exists and is flagged current, do not write again. The row is keyed by run ID and replaced in place, so a retry cannot create a duplicate final version.
- **On timeout, exhausted retries, or an error that cannot be retried:** Set status to "Failed," record whether the row or the "current" flag was confirmed, and escalate to the CPVC Event Planner. The earlier current plan, if any, stays current; do not report this run as finalized.
