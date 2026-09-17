# Combine Confirmation Data with Historical Attendance Rate Task Specification

```yaml
# BASIC INFORMATION
task_id: "T3"
task_name: "Combine Confirmation Data with Historical Attendance Rate"
task_owner: "CPVC Event Planner"

# Agent Inference Configuration
Provider: Claude
Model: "claude-sonnet-4-6"
Role: Assess event context, compare confirmation response patterns to historical norms, and determine a justified weighting between live confirmation data and historical attendance rate
Maximum inference requests per task run: "5"
On inference failure or exhausted limits: Record the unresolved status and hand the case to Event Forecasting Lead.
```

## 1. Task Goal

- **Objective:** Produce a single weighted attendance basis (a blend of live confirmation data and historical attendance rate) along with a written justification for the weighting used, so that Compute Predicted Attendance and Confidence Range (T5) can generate an accurate forecast.

## 2. Inbound Inputs

### Input 1

- **Input name:** Confirmation response data
- **What it contains:** Current RSVP confirmation counts and response timestamps for this event (number confirmed, number pending, response rate, timing of responses relative to send time).
- **Source:** Collect and Record Confirmation Responses (T2c)

### Input 2

- **Input name:** Historical attendance rate
- **What it contains:** Stored attendance rate(s) from comparable past events, including the sample size and date range the rate is drawn from.
- **Source:** Fall Back to Historical Base Rate (T4)

### Input 3

- **Input name:** Event context metadata
- **What it contains:** Event date, event type, and any known scheduling conflicts or anomalies (e.g., holidays, exam periods, competing campus events).
- **Source:** Retrieve Current Registration Data (T1)

## 3. Tool Permissions and Boundaries

## 4. How the Agent Should Reason

### Permitted Subtask 1

- **Subtask name:** Assess Event Context
- **Subtask description:** Examines event date, type, and known anomalies (holidays, exam periods, competing events, platform outages) to judge whether standard historical patterns are likely to apply to this event.
- **Subtask boundary:** Read-only; may not alter event records. Produces a finding (e.g., "typical event" or "atypical: exam week") used by later subtasks.
- **Retry limits:** 1

### Permitted Subtask 2

- **Subtask name:** Compare to Historical Patterns
- **Subtask description:** Examines the timing and shape of the current confirmation response curve against historical response curves for comparable events to judge whether the current response pattern is normal, slow, or anomalous.
- **Subtask boundary:** Read-only; may not alter confirmation or historical records. Produces a finding describing how the current pattern compares to history.
- **Retry limits:** 1

### Permitted Subtask 3

- **Subtask name:** Determine Weighting and Justify
- **Subtask description:** Synthesizes the findings from Assess Event Context and Compare to Historical Patterns to select a custom weighting between confirmation data and historical rate, and produces a written justification explaining the choice.
- **Subtask boundary:** May only set the blend weighting and justification text; may not finalize the attendance forecast or alter source data. Requires that at least one of the two prior subtasks has produced a usable finding.
- **Retry limits:** 1

- **Decision guidance:** After each subtask, use its findings to select the permitted subtask most likely to resolve the most important remaining uncertainty. Do not follow a fixed sequence. If no permitted subtask can make useful progress, stop and hand the case to a person.

## 5. When to Stop or Hand Off to a Human

- **Stop successfully when:** A blend weighting between confirmation data and historical rate has been determined and is supported by a written justification that references specific evidence (event context, response pattern comparison, or both).
- **Hand off early when:** Event context or historical attendance data cannot be retrieved, the confirmation and historical signals conflict in a way the agent cannot resolve, or no permitted subtask can make further progress toward a justified weighting.
- **Hand off to:** Event Forecasting Lead

Stop at the first applicable budget limit or handoff condition. While awaiting review, take no further autonomous action.

## 6. Outbound Deliverable

- **Status:** Completed or escalated to human.
- **Result or recommendation:** The determined blend weighting between confirmation data and historical attendance rate, passed to Compute Predicted Attendance and Confidence Range (T5). If escalated before reaching a supported result, write undetermined.
- **Evidence summary:** The event context and response-pattern findings that support the chosen weighting, or an explanation of why no weighting could be determined.
- **Subtasks performed:** Permitted subtasks completed, including repeated attempts.
- **Unresolved issues:** Remaining uncertainties or questions; use none only if no unresolved issue remains.
- **Handoff note:** Reason for stopping, unresolved questions, and what the reviewer needs to decide; write "Not applicable" for a completed task.
- **Next task or recipient:** Compute Predicted Attendance and Confidence Range (T5). Unresolved cases go to the Event Forecasting Lead.
