# Business Rules: u1-questions

## Sources

- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md`.
- Stories: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md` (US1.1, AC1.1.1–AC1.1.11).
- Unit: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work.md`, `unit-of-work-story-map.md`.
- Components: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/components.md`, `decisions.md`.
- Contracts: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md`.
- Answers: `functional-design-questions.md` `[Q1]`.

```yaml
rules:
  # BR1 intake: from the hook to the app
  - id: BR1.1
    statement: An event is accepted only from a live session the app started, with that session's secret, complete and well-formed.
    category: authorization
    applies_to: AgentChannel
    trigger: a new file appears in a session's events folder
    logic: IF the folder belongs to a live AgentSession AND line 1 reads "THADEUS-EVENT <version> <kind> <secret>" AND the secret matches AND the version is the app's or the one before AND the file is not .tmp AND it is at most 1 MB THEN emit it as a raw event ELSE delete it and emit nothing
    violation: nothing shown; the hook times out to the terminal as usual
    source: FR1.3, NFR3
  - id: BR1.2
    statement: The hook hands the question back when the app is gone.
    category: policy
    applies_to: ClaudeCodeHook, OpencodePlugin
    trigger: every 100 ms while waiting
    logic: IF the session's alive file is older than 2 s THEN print nothing and exit 0
    violation: none; the agent shows its own prompt
    source: FR6.3, NFR5
  - id: BR1.3
    statement: A waiting hook gives up before the agent's own limit.
    category: policy
    applies_to: ClaudeCodeHook, OpencodePlugin, AgentSession.waitSeconds
    trigger: every 100 ms while waiting
    logic: IF time waited reaches waitSeconds (the agent's limit minus 5 s) THEN print nothing and exit 0; the store marks the event timedOut
    violation: none; answers then go as keys (BR3.2)
    source: FR3.6, NFR5, [Q1]
  - id: BR1.4
    statement: The adapter turns a payload into a question event only from fields it knows; anything it cannot read becomes a refusal with a reason, never a guess.
    category: validation
    applies_to: HarnessEventAdapter
    trigger: a raw event of kind question
    logic: IF the payload has 1 to 4 questions, each with text and an option list (labels non-empty) THEN build the event keeping labels, descriptions and order exactly ELSE reject with a reason logged and show nothing
    violation: nothing shown; the agent's own picker stays usable in the terminal
    source: FR1.1, FR1.2, FR3.2

  # BR2 the open events
  - id: BR2.1
    statement: Open events are paged in arrival order, then by tab name; the page being read never jumps.
    category: policy
    applies_to: AgentEventStore, AgentDialog
    trigger: an event arrives or leaves
    logic: order by arrivedAt then tabId; IF the dialog shows a page THEN a new event only raises the count ("+1 new")
    violation: none
    source: FR6.1
  - id: BR2.2
    statement: A session has at most one open question event.
    category: constraint
    applies_to: AgentEventStore
    trigger: a question event arrives from a session with an open one
    logic: the older event becomes ended ("the session moved on") and the newer one is queued
    violation: none
    source: FR1.5
  - id: BR2.3
    statement: A question leaves the dialog when its session closes it, moves on, or exits.
    category: policy
    applies_to: AgentEventStore
    trigger: an "answered" event, any newer event from the same session, or the tab's exit
    logic: IF the closing event names a toolCallId THEN end the matching event ELSE end the session's open question; on exit end every event of the session, send nothing, and show "the session ended" for 3 s
    violation: none
    source: FR1.5, FR6.4
  - id: BR2.4
    statement: Only events that arrived after the app started exist.
    category: constraint
    applies_to: AgentChannel, AgentEventStore
    trigger: app start
    logic: clear every channel folder left from an earlier run before opening sessions
    violation: none
    source: FR6.3
  - id: BR2.5
    statement: AI-DLC's audit log adds context only.
    category: policy
    applies_to: AgentEventStore, FallbackQuestionSource
    trigger: a hook question event arrives
    logic: IF the session's project has an active intent with an open AI-DLC question or gate THEN set context to that intent and stage; never add, remove, reorder or rename an option
    violation: none
    source: FR1.4
  - id: BR2.6
    statement: Text is kept whole up to 64 KB, every character unchanged.
    category: validation
    applies_to: HarnessEventAdapter
    trigger: building a Question
    logic: IF text is longer than 64 KB THEN cut at 64 KB on a character boundary and set truncated; never strip or re-encode characters
    violation: none
    source: FR6.2
  - id: BR2.7
    statement: The source of events is chosen per project and harness.
    category: policy
    applies_to: AgentEventStore
    trigger: a project opens, or its install status changes
    logic: IF that harness's part is current for the project (until u4, a development switch) THEN show hook events for its tabs ELSE show today's audit-log questions for them
    violation: none
    source: FR4.5

  # BR3 answers
  - id: BR3.1
    statement: Main accepts an answer only for an open event of a live session, only if it fits the event, and only once.
    category: authorization
    applies_to: AgentEventStore
    trigger: agentEvents.answer
    logic: IF the event exists AND its state is shown or timedOut AND its session is live AND the answer has one entry per question with indexes inside the options (own text only where allowOwn, one pick for single-select) THEN accept ELSE refuse with the named error
    violation: refused; nothing reaches any agent
    source: FR3.1, NFR3
  - id: BR3.2
    statement: The answer goes back the way the agent can take it.
    category: policy
    applies_to: AgentEventStore, HarnessEventAdapter
    trigger: an accepted answer
    logic: IF the hook is still waiting AND the harness lets a hook return a question's answer THEN via hook (answer file) ELSE via keys, typed only after the agent's picker shows the event's first option label in that pty's output within 3 s
    violation: "the agent's picker is not showing"; nothing typed
    source: FR3.2, FR3.6
  - id: BR3.3
    statement: What the agent receives is the option at the picked index, never a label from the audit log.
    category: calculation
    applies_to: HarnessEventAdapter
    trigger: building the hook output or the key sequence
    logic: map each picked index to that question's option as the event carries it; key sequences come from the option's position in the agent's own list
    violation: none
    source: FR3.2
  - id: BR3.4
    statement: A failed send keeps everything and can be tried again.
    category: policy
    applies_to: AgentEventStore, AgentDialog
    trigger: a delivery fails
    logic: state goes back to shown (or stays timedOut), lastError holds one sentence, the typed answer stays in the dialog; Send works again
    violation: none
    source: FR3.5
  - id: BR3.5
    statement: Closing a question hands it back to the terminal.
    category: policy
    applies_to: AgentEventStore, AgentDialog
    trigger: Close or Esc on a question
    logic: write an empty answer file so the hook exits at once; state handedBack; show "Handed back to the terminal." for 5 s
    violation: none
    source: FR3.3
  - id: BR3.6
    statement: Audit (fallback) events are answered exactly as today.
    category: policy
    applies_to: AgentDialog, AgentEventStore
    trigger: an answer for an event with source audit
    logic: AgentDialog sends it through TerminalContext.answer(); agentEvents.answer refuses it
    violation: "fallback event: answered in the terminal path"
    source: FR4.5

  # BR4 what the dialog shows
  - id: BR4.1
    statement: Agent text is shown as sanitized Markdown, never as HTML.
    category: validation
    applies_to: AgentDialog
    trigger: rendering a question
    logic: render through FileContent with HTML skipped; links open in the system browser only on click and only for http and https
    violation: a link with another scheme is shown as text
    source: FR2.2, NFR3
  - id: BR4.2
    statement: Each option shows its label and, beneath it, its description.
    category: policy
    applies_to: AgentDialog
    trigger: rendering a question
    logic: list options in the event's order with number keys 1..n
    violation: none
    source: FR2.3
  - id: BR4.3
    statement: A batch is answered on one page and sent together.
    category: policy
    applies_to: AgentDialog
    trigger: an event with 2 to 4 questions
    logic: stack the questions; a question collapses to one line when answered; Send all answers is enabled only when every question has an answer
    violation: Send stays disabled with "<n> of <total> answered"
    source: FR2.4
  - id: BR4.4
    statement: Multi-select and own answers work as in the agent's picker.
    category: policy
    applies_to: AgentDialog
    trigger: rendering a question
    logic: multiSelect shows checkboxes and Done; allowOwn shows an own-answer field labelled with the agent's own word
    violation: none
    source: FR2.5, FR2.6
  - id: BR4.5
    statement: The dialog works by keyboard and names state in text.
    category: policy
    applies_to: AgentDialog
    trigger: dialog open
    logic: focus moves to the first choice; number keys pick, Space ticks, Enter sends, Esc closes; kind and state are words, not only colours; every app text through t()
    violation: none
    source: NFR6, NFR7
  - id: BR4.6
    statement: Today's calm-then-red escalation and alert settings carry over to the new dialog.
    category: policy
    applies_to: AgentDialog
    trigger: a question page open 20 s without an answer
    logic: switch to the overdue style and "still waiting" title; questionAlerts and notificationSound apply as in US-0505
    violation: none
    source: FR5.1
```

## Summary

| Group | Rules | What they settle |
|---|---|---|
| BR1 Intake | BR1.1–BR1.4 | Which events are accepted; when the hook gives up; how payloads are read |
| BR2 Open events | BR2.1–BR2.7 | Order, one question per session, closing, start-up, context, size, source choice |
| BR3 Answers | BR3.1–BR3.6 | The answer check, hook or keys delivery, index mapping, failure and retry, close, fallback |
| BR4 Display | BR4.1–BR4.6 | Markdown, descriptions, batches, multi-select and own answer, keyboard, escalation |
