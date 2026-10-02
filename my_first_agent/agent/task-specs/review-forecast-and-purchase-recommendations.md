# Review Forecast and Purchase Recommendations Task Specification

## Basic Information

- **Task ID:** H3
- **Task name:** Review Forecast and Purchase Recommendations
- **Task type:** Verify
- **Task owner:** CPVC Event Planner.

## 1. Task Description

The CPVC Event Planner reviews the forecast report and decides whether the predicted attendance, range, and purchase quantities are reasonable to plan with. They use their own judgment and knowledge the system does not have, such as a competing event announced yesterday or a sponsor supplying food. They choose one of two decisions: approve the forecast as-is, or override it by entering their own predicted attendance and a reason. This human checkpoint keeps purchase decisions with organizers, as the system goal requires. Silence is not approval: if no decision is recorded by the deadline, the forecast stays unapproved and is not finalized.

## 2. Inputs

### Input 1

- **Input name:** Review request
- **Contents and format:** The forecast report email: numbers section, plain-language summary or "Summary unavailable," data quality flags, review deadline, and Review Google Form link prefilled with the run ID.
- **Source:** T8: Send Report to Organizers for Review.

### Input 2

- **Input name:** Review response
- **Contents and format:** Human response on the Review Google Form: run ID, decision (approve or override), override predicted attendance (whole number, required for override), reason (required for override), reviewer name, and submission time.
- **Source:** CPVC Event Planner.

- **If a required input is missing or invalid:** If the review request never arrived, T8's failure has already been escalated and there is nothing to review. An override without a whole-number attendance or a reason is rejected by the form and must be resubmitted. A response for a run ID that is not the latest sent report is recorded but not applied, and the Event Planner is told which report is current.

## 3. Outputs

### Output 1

- **Output name:** Approved forecast decision
- **Contents and format:** Row in the Review Decisions tab: run ID, decision "approve," reviewer, and time.
- **Next task or recipient:** T9: Finalize Forecast and Purchase Recommendations.
- **Complete when:** One valid "approve" row exists for the run ID before the deadline.

### Output 2

- **Output name:** Override decision
- **Contents and format:** Row in the Review Decisions tab: run ID, decision "override," override predicted attendance, reason, reviewer, and time.
- **Next task or recipient:** T10: Log Organizer Override.
- **Complete when:** One valid "override" row exists for the run ID, with a whole-number attendance and a reason, before the deadline.

### Output 3

- **Output name:** Overdue review notice
- **Contents and format:** Reports tab status "Review overdue, forecast not final" for the run ID, with the deadline that passed.
- **Next task or recipient:** CPVC Event Planner; the next scheduled run produces a new report that replaces this one.
- **Complete when:** The status is saved and the forecast for this run is marked not final.

## 4. Planned Tools

### Tool 1

- **Tool name:** `record_review_decision`
- **Input:** Review request; Review response.
- **Output:** Approved forecast decision; Override decision; Overdue review notice.
- **Implementation Route:** Web API calls; Review Google Form linked to the Review Decisions tab, and Google Sheets API reads and writes that validate the response and update the Reports tab status.
- **Integration approach:** Direct integration.
- **Role in this task:** Presents the review form, records the Event Planner's decision for the run ID, and marks the review overdue when the deadline passes. It does not make or suggest the decision, and it never records approval on its own.
- **Task timeout:** Human response deadline: 24 hours after T8 sends the report.
- **Maximum retries:** Not applicable — manual task.
- **Retry only when:** Not applicable.
- **On timeout, exhausted retries, or an error that cannot be retried:** If no decision arrives by the deadline, save the Overdue review notice and leave the forecast unapproved; T9 does not run for this run ID. The case stays with the CPVC Event Planner, and the next scheduled run produces a new report. If recording a submitted decision fails or its outcome is uncertain, the form shows an error, the Event Planner is asked to resubmit, and only the first valid decision per run ID is applied, so a resubmission cannot create a conflicting duplicate.
