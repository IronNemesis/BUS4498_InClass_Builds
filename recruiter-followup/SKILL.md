---
name: "recruiter-followup"
description: "Draft an email to followup with a recruiter following a live interaction."
---

# recruiter-followup

## User inputs
User supplies the recruiter name, company, contact information, and something that came up during a live conversation with them. The email should include details from the user's resume that are applicable to the industry the recruiter woks in. If an essential fact is missing, ask the user for more information.

## Procedure
1. Read user input
2. Draft email based on user inputs and resume
3. Ask user to review the email before sending

## Output
Return a drafted email.

## Boundaries
Do not send an email without first prompting the user. The email should not be longer than 2 paragraphs.
