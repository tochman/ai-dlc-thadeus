# Functional Design questions: u1-questions

Background: almost everything this Unit needs is settled in the requirements, stories, mockups, components and contracts. The design carries over today's calm-then-red escalation and `questionAlerts` into the new dialog in this Unit, so nothing regresses before u5. Closing a batch that is only partly answered hands the whole batch back to the terminal and keeps nothing. One choice is yours.

## Q1. [Product] How long may a question wait in the dialog before it goes back to the terminal?

While the dialog shows a question, the agent waits for it (FR3.3). After this time the hook hands the question back to the agent's own picker; you can still answer from the dialog, and the app then presses the keys (FR3.6). The spike checks the most Claude Code allows; the wait is never longer than that.

A. As long as the agent allows (the spike's limit, minus a few seconds)
B. 2 minutes
C. 5 minutes
X. Other (please specify)

[Answer]: A
**Mode:** guided
