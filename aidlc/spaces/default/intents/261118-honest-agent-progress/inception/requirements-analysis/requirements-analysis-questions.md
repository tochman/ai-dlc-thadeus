# Requirements Analysis Questions: US-0030 honest agent progress

Context: the code scan found four causes (see `inception/reverse-engineering/developer-scan.md`, Handoff Summary). These questions settle the choices the fix cannot make on its own.

## Q1. [Product owner] How much of an agent's own text may a row in Agent progress show?

US-0214 decided that a row shows no text from the agent, only identifiers (tool name, agent type). US-0030 asks for the task ("Build US-0215 token history") and what the agent is doing ("Rerunning view tests after fixing expectation"). Both come from text the agent wrote.

A. The task description and the tool call's description, each cut to one line (about 80 characters), cleaned of control characters and paths outside the project
B. Only the task description; tool calls still show only the tool's name
C. No agent text; keep identifiers only (the task and activity criteria are dropped)
X. Other (please specify)

[Answer]: A

## Q2. [Product owner] When should a row say that its state is old?

Today a quiet row turns idle after 30 seconds, but a waiting row never does, so "waiting for your permission (5 min)" looked current. The new rule shows "seen N ago" once a row has had no new event for a while.

A. After 30 seconds with no event (the same as the idle rule today)
B. After 2 minutes with no event
C. After 5 minutes with no event
X. Other (please specify)

[Answer]: A

## Q3. [Developer] When a background agent asks for permission, which rows say so?

Today every permission request lands on the main row, so the main row said "waiting for your permission" while the request, if any, was a background agent's. The person is still asked either way.

A. The agent that asked shows "waiting for your permission"; the main row shows "waiting for <agent>" while that agent runs
B. Only the agent that asked shows it; the main row keeps its own state
C. Both rows show "waiting for your permission"
X. Other (please specify)

[Answer]: A
