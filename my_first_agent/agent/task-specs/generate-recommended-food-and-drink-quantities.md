# Generate Recommended Food and Drink Quantities Task Specification

## Basic Information

- **Task ID:** T6
- **Task name:** Generate Recommended Food and Drink Quantities
- **Task type:** Reason
- **Task owner:** RSVP Sentinel; the CPVC Event Planner is accountable.

## 1. Task Description

T6 converts the attendance forecast into a shopping list, which is the decision organizers actually need to make. It applies fixed per-attendee rates from the Purchase Rates tab (defaults: 2.5 pizza slices, 2 drinks, and 1 swag item per attendee, with 8 slices per pizza). Food and drinks are planned to the high end of the forecast range, so participants are not left short. Swag is planned to the predicted attendance, because leftover swag wastes the most budget. Every quantity is rounded up to a whole unit. T6 recommends quantities only; it does not place orders or spend money.

## 2. Inputs

### Input 1

- **Input name:** Attendance forecast
- **Contents and format:** Structured record: run ID, predicted attendance, and low and high ends of the range.
- **Source:** T5: Compute Predicted Attendance and Confidence Range.

### Input 2

- **Input name:** Purchase rates
- **Contents and format:** Table in the Purchase Rates tab: item (pizza slices, drinks, swag), quantity per attendee, unit size (for example, 8 slices per pizza), and which forecast value to plan to (high end or predicted attendance).
- **Source:** CPVC Event Planner, who maintains the Purchase Rates tab.

- **If a required input is missing or invalid:** If the forecast is missing, T6 does not run. If the Purchase Rates tab cannot be read or has a missing or negative rate, T6 stops with status "Failed" and escalates to the CPVC Event Planner. T6 does not fall back to built-in quantities without the Event Planner's confirmation.

## 3. Outputs

### Output 1

- **Output name:** Purchase recommendations
- **Contents and format:** Structured record saved to the Forecasts tab row for this run: run ID, and for each item the recommended quantity, unit, per-attendee rate, and forecast value used (quantity = rate × forecast value ÷ unit size, rounded up).
- **Next task or recipient:** T7: Package Forecast and Recommendations into Report; T9: Finalize Forecast and Purchase Recommendations uses the same rule if a forecast is overridden.
- **Complete when:** Every item in the Purchase Rates tab has a whole-number quantity and a shown calculation.

## 4. Planned Tools

### Tool 1

- **Tool name:** `calculate_purchase_quantities`
- **Input:** Attendance forecast; Purchase rates.
- **Output:** Purchase recommendations.
- **Implementation Route:** Web API calls; Google Sheets API read of the Purchase Rates tab and write to this run's Forecasts row, plus functions/scripts that apply the per-attendee rule.
- **Integration approach:** Direct integration.
- **Role in this task:** Calculates each item's quantity from the forecast and rates and saves the results to this run's row. It cannot order, purchase, or change the purchase rates.
- **Task timeout:** 15 seconds for one task run, including retries.
- **Maximum retries:** 1
- **Retry only when:** A temporary Google Sheets API read or write error occurs. Wait 5 seconds and read back this run's row before writing again. Quantities are written to the row keyed by run ID and replaced in place, so a retry cannot create duplicates.
- **On timeout, exhausted retries, or an error that cannot be retried:** Set status to "Failed," record the failed step and attempts, and escalate to the CPVC Event Planner. Do not send a report without purchase recommendations or present estimated quantities as calculated ones.
