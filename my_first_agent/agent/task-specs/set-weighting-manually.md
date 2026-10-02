# Set Weighting Manually Task Specification

## Basic Information

- **Task ID:** H2
- **Task name:** Set Weighting Manually
- **Task type:** Decide
- **Task owner:** CPVC Event Planner.

## 1. Task Description

When T3 cannot reach a justified weighting within its limits (for example, because confirmation and historical signals conflict), the CPVC Event Planner decides how much to trust live confirmation data versus the historical attendance rate. They read T3's evidence and handoff note, apply their own knowledge of the event, and enter a weight on live data between 0 and 1 with a short justification. The workflow needs H2 so an unresolved case gets a human decision instead of a guessed weighting, and T5 can continue the run. A missed deadline is not a decision: no weighting is assumed.

## 2. Inputs

### Input 1

- **Input name:** T3 escalation deliverable
- **Contents and format:** T3's outbound deliverable with status "Escalated to human": evidence summary, subtasks performed, unresolved issues, and handoff note stating what the reviewer needs to decide.
- **Source:** T3: Combine Confirmation Data with Historical Attendance Rate.

### Input 2

- **Input name:** Confirmation response data
- **Contents and format:** Structured record: confirmed yes, confirmed no, pending, response rate, and status.
- **Source:** T2: Send One-Click Confirmation Email to RSVPed Participants.

### Input 3

- **Input name:** Historical attendance rate
- **Contents and format:** Structured record: selected rate, events used, sample size, and date range.
- **Source:** Event History tab, or T4: Apply Historical Base Rate on the low-response path.

### Input 4

- **Input name:** Manual weighting response
- **Contents and format:** Human response: run ID, weight on live confirmation data (0 to 1), justification, decider name, and time.
- **Source:** CPVC Event Planner.

- **If a required input is missing or invalid:** If T3's escalation deliverable is missing, the Event Planner uses the confirmation and historical data directly and notes that T3's evidence was unavailable. A weight outside 0 to 1 or a missing justification is rejected and must be resubmitted.

## 3. Outputs

### Output 1

- **Output name:** Weighting decision
- **Contents and format:** This run's row in the Weighting Decisions tab: run ID, weight on live confirmation data, weight on historical rate (1 minus the live weight), justification, source "set manually in H2," decider, and time.
- **Next task or recipient:** T5: Compute Predicted Attendance and Confidence Range.
- **Complete when:** One valid row exists for the run ID with weights that add to 1 and a justification.

## 4. Planned Tools

### Tool 1

- **Tool name:** `record_manual_weighting`
- **Input:** T3 escalation deliverable; Confirmation response data; Historical attendance rate; Manual weighting response.
- **Output:** Weighting decision.
- **Implementation Route:** Web API calls; a Gmail API notification to the CPVC Event Planner linking a Weighting Google Form, and a Google Sheets API insert-or-replace write to the Weighting Decisions tab.
- **Integration approach:** Direct integration.
- **Role in this task:** Shows the Event Planner T3's evidence, validates their entry, and saves one weighting row keyed by run ID so T5 can continue. It does not suggest or choose a weight.
- **Task timeout:** Human response deadline: 1 business day after T3 escalates.
- **Maximum retries:** Not applicable — manual task.
- **Retry only when:** Not applicable.
- **On timeout, exhausted retries, or an error that cannot be retried:** If the deadline passes, mark the run "Weighting overdue, no forecast this run" and send one overdue reminder to the CPVC Event Planner; T5 does not run, and the next scheduled run starts over at T1. If saving the weighting fails or its outcome is uncertain, the Event Planner is asked to resubmit, and the row is keyed by run ID so a resubmission replaces it instead of creating a duplicate.
