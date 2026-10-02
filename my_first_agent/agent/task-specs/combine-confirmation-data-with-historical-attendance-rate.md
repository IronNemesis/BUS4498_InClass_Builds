# Combine Confirmation Data with Historical Attendance Rate Task Specification

```yaml
# BASIC INFORMATION
task_id: "T3"
task_name: "Combine Confirmation Data with Historical Attendance Rate"
task_owner: "CPVC Event Planner"

# Agent Inference Configuration
Provider: Groq
Model: "openai/gpt-oss-120b"
Role: Assess event context, compare confirmation response patterns to historical norms, select the next permitted subtask, and determine a justified weighting between live confirmation data and historical attendance rate
Maximum inference requests per task run: 5
On inference failure or exhausted limits: Record the unresolved status and hand the case to the CPVC Event Planner.
```

## 1. Task Goal

- **Objective:** Produce a single weighted attendance basis (a blend of live confirmation data and historical attendance rate) along with a written justification for the weighting used, so that Compute Predicted Attendance and Confidence Range (T5) can generate an accurate forecast.

## 2. Inbound Inputs

### Input 1

- **Input name:** Confirmation response data
- **What it contains:** Current RSVP confirmation counts and response timestamps for this event (number confirmed, number pending, response rate, timing of responses relative to send time).
- **Source:** T2: Send One-Click Confirmation Email to RSVPed Participants (T2 records the responses it collects in the Confirmation Log tab)

### Input 2

- **Input name:** Historical attendance rate
- **What it contains:** Stored attendance rate(s) from comparable past events, including the sample size and date range the rate is drawn from.
- **Source:** Event History tab of the RSVP Sentinel workbook (stored CPVC past-event attendance records, updated by T11) on the normal path; T4: Apply Historical Base Rate when the confirmation response rate is unusually low

### Input 3

- **Input name:** Event context metadata
- **What it contains:** Event date, event type, and any known scheduling conflicts or anomalies (e.g., holidays, exam periods, competing campus events).
- **Source:** T1: Retrieve Current Registration Data

## 3. Tool Permissions and Boundaries

### Task-Wide Limits

- **Total task timeout:** 90 seconds for one task run, including inference requests, tool calls, retries, and waiting. A tool call or retry does not restart this clock.
- **Maximum tool calls:** 8 calls across all tools during one task run; retries count toward this total. The 5 inference requests in the Agent Inference Configuration are counted separately but share the same 90-second budget. The subtask retry limits in Section 4 also apply.

Tools may use only this event's registration, confirmation, and historical attendance records. They may not modify registration or confirmation records, contact participants, send messages, collect new personal data, finalize the attendance forecast, or make purchase decisions. Tools 1 through 3 are read-only. Tool 4 may write only this run's weighting record for T5.

### Tool 1

- **Tool name:** `retrieve_confirmation_data`
- **Input:** Confirmation response data
- **Output:** Confirmation counts, response rate, and response timing for the Evidence summary; missing or incomplete confirmation data for Unresolved issues.
- **Implementation Route:** Web API calls; read-only Google Sheets API access to this event's rows in the Confirmation Log tab.
- **Integration approach:** Direct integration.
- **Role in this task:** Support Compare to Historical Patterns by supplying the current confirmation response curve.
- **Task timeout:** Subject to the 90-second total task timeout. Each call may take at most 10 seconds or the remaining task time, whichever is shorter.
- **Maximum retries:** 1 additional attempt per invocation, subject to the task-wide call and time limits.
- **Retry only when:** A temporary Google Sheets API connection or read error prevents completion. Wait 2 seconds and retry only if enough time and call budget remain. Do not retry denied access, an invalid event reference, or confirmed missing records. This tool is read-only, so retries cannot create duplicate records or messages.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the attempted query, failure category, and number of attempts in Subtasks performed and Unresolved issues. Set Status to "Escalated to human," set Result or recommendation to "undetermined," and hand the case to the CPVC Event Planner with a Handoff note naming the missing confirmation data. Do not treat unreadable confirmation data as a low response rate.

### Tool 2

- **Tool name:** `retrieve_historical_rates`
- **Input:** Historical attendance rate
- **Output:** Past-event attendance rates, response curves, sample sizes, and date ranges for the Evidence summary; stale, sparse, or missing history for Unresolved issues.
- **Implementation Route:** Web API calls; read-only Google Sheets API access to the Event History tab, or the fallback rate supplied by T4.
- **Integration approach:** Direct integration.
- **Role in this task:** Support Compare to Historical Patterns and Determine Weighting and Justify by supplying the historical baseline and comparable response curves.
- **Task timeout:** Subject to the 90-second total task timeout. Each call may take at most 10 seconds or the remaining task time, whichever is shorter.
- **Maximum retries:** 1 additional attempt per invocation, subject to the task-wide call and time limits.
- **Retry only when:** A temporary Google Sheets API connection or read error prevents completion. Wait 2 seconds and retry only if enough time and call budget remain. Do not retry denied access or a confirmed absence of comparable past events. This tool is read-only, so retries cannot create duplicate records or messages.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the attempted query, failure category, and number of attempts in Subtasks performed and Unresolved issues. Set Status to "Escalated to human," set Result or recommendation to "undetermined," and hand the case to the CPVC Event Planner with a Handoff note naming the missing historical data. Do not substitute an assumed rate for unreadable history.

### Tool 3

- **Tool name:** `retrieve_event_context`
- **Input:** Event context metadata
- **Output:** Event date, event type, and known anomalies (holidays, exam periods, competing campus events) for the Evidence summary; unknown or conflicting context for Unresolved issues.
- **Implementation Route:** Web API calls; read-only Google Sheets API access to the Event Details tab supplied by T1.
- **Integration approach:** Direct integration.
- **Role in this task:** Support Assess Event Context by supplying the facts used to judge whether historical patterns are likely to apply.
- **Task timeout:** Subject to the 90-second total task timeout. Each call may take at most 10 seconds or the remaining task time, whichever is shorter.
- **Maximum retries:** 1 additional attempt per invocation, subject to the task-wide call and time limits.
- **Retry only when:** A temporary Google Sheets API read error prevents completion. Wait 2 seconds and retry only if enough time and call budget remain. Do not retry denied access or a missing event record. This tool is read-only, so retries cannot create duplicate records or messages.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the attempted read, failure category, and number of attempts in Subtasks performed and Unresolved issues. If Compare to Historical Patterns has produced a usable finding, continue without the event context and list it as unresolved; otherwise set Status to "Escalated to human," set Result or recommendation to "undetermined," and hand the case to the CPVC Event Planner. Do not treat missing context as a "typical event" finding.

### Tool 4

- **Tool name:** `record_weighting_decision`
- **Input:** The Result or recommendation (blend weighting) and Evidence summary (written justification) produced by Determine Weighting and Justify, with the run ID and event ID.
- **Output:** The Result or recommendation and Evidence summary saved as this run's weighting record for T5, and a write confirmation for Subtasks performed; an unconfirmed write for Unresolved issues.
- **Implementation Route:** Web API calls; a Google Sheets API insert-or-replace write to this run's row in the Weighting Decisions tab only.
- **Integration approach:** Direct integration.
- **Role in this task:** Support Determine Weighting and Justify by saving the chosen weighting and justification so T5: Compute Predicted Attendance and Confidence Range can use it.
- **Task timeout:** Subject to the 90-second total task timeout. Each call may take at most 10 seconds or the remaining task time, whichever is shorter.
- **Maximum retries:** 1 additional attempt, subject to the task-wide call and time limits.
- **Retry only when:** The write fails with a temporary Google Sheets API error. Before retrying, wait 2 seconds and read back the record for this run ID. If the record already matches, treat the write as complete and do not retry. The run ID is the record key, so a retry replaces this run's record instead of creating a duplicate. If the read-back cannot confirm whether the first write succeeded, do not retry; hand off.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the attempted write, failure category, number of attempts, and whether the read-back confirmed anything in Subtasks performed and Unresolved issues. Set Status to "Escalated to human," keep the determined weighting and justification in the deliverable, and hand the case to the CPVC Event Planner with a Handoff note saying the weighting was not confirmed as saved. Do not signal T5 that a weighting is available until the write is confirmed.

## 4. How the Agent Should Reason

### Permitted Subtask 1

- **Subtask name:** Assess Event Context
- **Subtask description:** Examines event date, type, and known anomalies (holidays, exam periods, competing events, platform outages) to judge whether standard historical patterns are likely to apply to this event.
- **Subtask boundary:** Read-only; may not alter event records. Produces a finding (e.g., "typical event" or "atypical: exam week") used by later subtasks.
- **Retry limits:** Perform once with the current evidence. Repeat once only after new material evidence, such as a successful tool retry that supplies previously missing data.

### Permitted Subtask 2

- **Subtask name:** Compare to Historical Patterns
- **Subtask description:** Examines the timing and shape of the current confirmation response curve against historical response curves for comparable events to judge whether the current response pattern is normal, slow, or anomalous.
- **Subtask boundary:** Read-only; may not alter confirmation or historical records. Produces a finding describing how the current pattern compares to history.
- **Retry limits:** Perform once with the current evidence. Repeat once only after new material evidence, such as a successful tool retry that supplies previously missing data.

### Permitted Subtask 3

- **Subtask name:** Determine Weighting and Justify
- **Subtask description:** Synthesizes the findings from Assess Event Context and Compare to Historical Patterns to select a custom weighting between confirmation data and historical rate, and produces a written justification explaining the choice.
- **Subtask boundary:** May only set the blend weighting and justification text; may not finalize the attendance forecast or alter source data. Requires that at least one of the two prior subtasks has produced a usable finding.
- **Retry limits:** Perform once with the current evidence. Repeat once only after new material evidence, such as a successful tool retry that supplies previously missing data.

- **Decision guidance:** After each subtask, use its findings to select the permitted subtask most likely to resolve the most important remaining uncertainty. Do not follow a fixed sequence. If no permitted subtask can make useful progress, stop and hand the case to a person.

## 5. When to Stop or Hand Off to a Human

- **Stop successfully when:** A blend weighting between confirmation data and historical rate has been determined and is supported by a written justification that references specific evidence (event context, response pattern comparison, or both).
- **Hand off early when:** Confirmation response data or historical attendance data cannot be retrieved, event context cannot be retrieved and Compare to Historical Patterns has not produced a usable finding, the confirmation and historical signals conflict in a way the agent cannot resolve, or no permitted subtask can make further progress toward a justified weighting.
- **Hand off to:** CPVC Event Planner

Stop at the first applicable budget limit or handoff condition. While awaiting review, take no further autonomous action.

## 6. Outbound Deliverable

- **Status:** Completed or escalated to human.
- **Result or recommendation:** The determined blend weighting between confirmation data and historical attendance rate, passed to Compute Predicted Attendance and Confidence Range (T5). If escalated before reaching a supported result, write undetermined.
- **Evidence summary:** The event context and response-pattern findings that support the chosen weighting, or an explanation of why no weighting could be determined.
- **Subtasks performed:** Permitted subtasks completed, including repeated attempts.
- **Unresolved issues:** Remaining uncertainties or questions; use none only if no unresolved issue remains.
- **Handoff note:** Reason for stopping, unresolved questions, and what the reviewer needs to decide; write "Not applicable" for a completed task.
- **Next task or recipient:** Compute Predicted Attendance and Confidence Range (T5). Unresolved cases go to the CPVC Event Planner through H2: Set Weighting Manually.
