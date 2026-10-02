# Resolve Registration Data Issue Task Specification

## Basic Information

- **Task ID:** H1
- **Task name:** Resolve Registration Data Issue
- **Task type:** Verify
- **Task owner:** CPVC Event Planner.

## 1. Task Description

When T1 cannot read the registration or event data, the CPVC Event Planner finds and fixes the cause, such as a renamed tab, a disconnected RSVP Google Form, revoked sharing access, or a missing event date. This takes human judgment and account access the system does not have. The Event Planner records what was wrong and what they changed, and then either starts a manual run or lets the next scheduled run pick up. H1 exists so the workflow never forecasts from missing or broken data. A missed deadline is not a resolution: the issue stays open until the Event Planner records one.

## 2. Inputs

### Input 1

- **Input name:** Retrieval failure report
- **Contents and format:** Issues tab record: run ID, the tab that could not be read or the missing required field, failure category, number of attempts, and time of failure.
- **Source:** T1: Retrieve Current Registration Data.

### Input 2

- **Input name:** Resolution response
- **Contents and format:** Human response: issue ID, cause found, change made, whether to start a manual run now, resolver name, and time.
- **Source:** CPVC Event Planner.

- **If a required input is missing or invalid:** If the failure report is incomplete, the Event Planner checks the Registrations and Event Details tabs directly. A resolution without a cause or change is not accepted, and the issue stays open.

## 3. Outputs

### Output 1

- **Output name:** Resolution record
- **Contents and format:** The Issues tab record updated with status (resolved or open), cause, change made, resolver, time, and whether a manual run was requested.
- **Next task or recipient:** T1: Retrieve Current Registration Data, through a manual run or the next scheduled run.
- **Complete when:** The issue is marked resolved with a cause and change, and the next T1 run reads the data successfully. If that run fails again, the issue reopens.

## 4. Planned Tools

### Tool 1

- **Tool name:** `record_data_issue_resolution`
- **Input:** Retrieval failure report; Resolution response.
- **Output:** Resolution record.
- **Implementation Route:** Web API calls; a Gmail API notification to the CPVC Event Planner with the failure report, and Google Sheets API reads and writes of the Issues tab.
- **Integration approach:** Direct integration.
- **Role in this task:** Notifies the Event Planner once per issue ID, shows the failure details, saves their resolution, and starts a manual run if requested. It does not attempt the fix or mark an issue resolved on its own.
- **Task timeout:** Human response deadline: 1 business day after the failure report is created.
- **Maximum retries:** Not applicable — manual task.
- **Retry only when:** Not applicable.
- **On timeout, exhausted retries, or an error that cannot be retried:** If the deadline passes, mark the issue "overdue" and send one overdue reminder to the CPVC Event Planner; the issue stays open and no forecast is produced until data can be read. If saving the resolution fails or its outcome is uncertain, the Event Planner is asked to confirm it again, and the record is keyed by issue ID so a resubmission updates it instead of creating a duplicate.
