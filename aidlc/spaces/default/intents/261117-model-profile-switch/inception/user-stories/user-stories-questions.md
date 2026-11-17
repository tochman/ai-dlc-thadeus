# User Stories Plan and Questions: US-0210

## Plan

- **Personas:** one, the developer who pays for every agent run and drives AI-DLC through the app (from US-0210). No second persona: the app is single-user and local.
- **Format:** INVEST stories, "As a … I want … so that …", acceptance criteria in Given/When/Then with IDs `AC{g}.{s}.{n}`.
- **Priority:** MoSCoW per story.
- **Breakdown:** chosen in Q1.

## Q1. [Product owner] How should the stories be cut?

A. By workflow step: (1) set up critical plans and the two profiles, (2) switch to critical when a critical intent starts, (3) switch back to economy when the last critical intent ends. Feedback (active profile, command output, failures) and the harness rule are acceptance criteria in stories 2 and 3.
B. One story per requirement group: settings, switch to critical, switch back, feedback, harness (five stories).
X. Other (please specify)

[Answer]: A (By workflow step)

## Q2. [Product owner] How important is "Ask before switching back" (FR1.4)?

The story says the app switches back on its own, "or asks first if the person chose that".

A. Must Have: it ships in this story.
B. Should Have: build it in this story if it fits; it may move to a later story.
X. Other (please specify)

[Answer]: A (Must Have)
