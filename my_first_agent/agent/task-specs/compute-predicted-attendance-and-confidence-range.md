# Compute Predicted Attendance and Confidence Range Task Specification

## Basic Information

- **Task ID:** T5
- **Task name:** Compute Predicted Attendance and Confidence Range
- **Task type:** Reason
- **Task owner:** RSVP Sentinel; the CPVC Event Planner is accountable.

## 1. Task Description

T5 turns the weighting chosen in T3 (or set manually in H2) into a predicted headcount with a range. It uses a fixed formula so the same inputs always produce the same forecast:

- **Live rate:** confirmed yes divided by (confirmed yes plus confirmed no). If no one has answered, the live rate is not used and the weight on live data is treated as 0.
- **Blended rate:** (weight on live data × live rate) + ((1 minus weight on live data) × historical rate).
- **Predicted attendance:** blended rate × active registrant count, rounded to the nearest whole person.
- **Range:** predicted attendance plus or minus (active registrant count × the standard deviation of attendance rates across the past events used), when at least 3 past events were used; otherwise plus or minus 20% of predicted attendance. The low end is never below the confirmed yes count, and the high end is never above the active registrant count.

The workflow needs a range, not just one number, because T6 plans food and drinks to the high end so participants are not left short.

## 2. Inputs

### Input 1

- **Input name:** Weighting decision
- **Contents and format:** Structured record from this run's row in the Weighting Decisions tab: run ID, weight on live confirmation data (0 to 1), weight on historical rate, written justification, and source (T3 or set manually in H2).
- **Source:** T3: Combine Confirmation Data with Historical Attendance Rate, or H2: Set Weighting Manually when T3 escalated.

### Input 2

- **Input name:** Confirmation response data
- **Contents and format:** Structured record: confirmed yes, confirmed no, pending, response rate, and response rate status.
- **Source:** T2: Send One-Click Confirmation Email to RSVPed Participants.

### Input 3

- **Input name:** Historical attendance rate
- **Contents and format:** Structured record: selected rate, events used, sample size, and the rates of each past event used (for the standard deviation).
- **Source:** Event History tab on the normal path, or T4: Apply Historical Base Rate on the low-response path, as used by T3.

### Input 4

- **Input name:** Current registration snapshot
- **Contents and format:** Structured record including the active registrant count.
- **Source:** T1: Retrieve Current Registration Data.

- **If a required input is missing or invalid:** If no weighting decision exists for this run, T5 does not run; it waits for H2: Set Weighting Manually. If a weight is outside 0 to 1, the two weights do not add to 1, or any other input is missing, T5 stops with status "Failed" and escalates to the CPVC Event Planner. No forecast is produced from invalid inputs.

## 3. Outputs

### Output 1

- **Output name:** Attendance forecast
- **Contents and format:** Structured record saved to the Forecasts tab: run ID, event ID, predicted attendance, low and high ends of the range, range method (standard deviation or plus or minus 20%), blended rate, live rate, historical rate, weights used, weighting source (T3 or H2), active registrant count, and calculation time.
- **Next task or recipient:** T6: Generate Recommended Food and Drink Quantities and T7: Package Forecast and Recommendations into Report.
- **Complete when:** Predicted attendance and both range ends are whole numbers, the low end is at or below the prediction and the high end is at or above it, and every input value used is recorded.

## 4. Planned Tools

### Tool 1

- **Tool name:** `compute_attendance_forecast`
- **Input:** Weighting decision; Confirmation response data; Historical attendance rate; Current registration snapshot.
- **Output:** Attendance forecast.
- **Implementation Route:** Functions/scripts that apply the fixed formula, plus a Google Sheets API write (web API call) of this run's row in the Forecasts tab.
- **Integration approach:** Direct integration.
- **Role in this task:** Calculates the prediction and range from the inputs and saves one forecast row keyed by run ID. It cannot change the weighting or any source data.
- **Task timeout:** 15 seconds for one task run, including retries.
- **Maximum retries:** 1
- **Retry only when:** The Forecasts tab write fails with a temporary Google Sheets API error. Wait 5 seconds and read back this run's row first; if it already matches, do not write again. The row is keyed by run ID and replaced in place, so a retry cannot create a duplicate. A calculation error is not retried.
- **On timeout, exhausted retries, or an error that cannot be retried:** Set status to "Failed," record the failed step and attempts, and escalate to the CPVC Event Planner. Do not pass an unsaved or partial forecast to T6 or T7.
