# Business Rules: u3-replies

## Sources

- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (FR1.1, FR1.2, FR2.1, FR2.2, FR2.7, FR2.8, FR3.1, FR3.3, FR3.5, FR4.5, FR5.1, FR6.1, FR6.2, FR6.4, NFR3, NFR4, NFR5).
- Stories: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md` (US3.1, AC3.1.1–AC3.1.5).
- Unit: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work.md`, `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work-story-map.md`.
- Components: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/components.md`.
- Contracts: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1–C4, C6).
- Mockups: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/refined-mockups/mockups.md` (M4, M5, M6).
- Integration point: `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/rules.md` (BR1–BR4, reused by id, not restated).
- Answers: `functional-design-questions.md` Q1 `[Q1]` (B: a reply turns red after 20 s like a question).

u1's rules apply to replies where they are written for every event: intake and the secret check (BR1.1), page order inside a group (BR2.1), nothing from before the app started (BR2.4), the 64 KB cut (BR2.6), source choice (BR2.7), sanitized Markdown (BR4.1) and keyboard and text rules (BR4.5). The rules below are what replies add or change.

```yaml
rules:
  # BR6 replies
  - id: BR6.1
    statement: The Claude Code stop hook hands the reply to the app and returns at once, changing nothing in the agent.
    category: policy
    applies_to: ClaudeCodeHook
    trigger: Claude Code's Stop hook fires for an app session
    logic: write the event file with kind reply and the hook's stdin unchanged, then exit 0 with nothing on stdout or stderr; never wait, never exit 2, never print a decision; IF the write fails THEN still exit 0 silently
    violation: none; the agent stops exactly as without the hook
    source: FR1.1, FR3.3, NFR4, NFR5
  - id: BR6.2
    statement: The opencode plugin forwards an idle top-level session with its last assistant message and never blocks opencode.
    category: policy
    applies_to: OpencodePlugin
    trigger: a session.status event with status.type idle in an app session
    logic: IF the session has no parent session THEN read its last assistant message with ctx.session.context({ sessionID }) and write the event file with kind reply and both payloads unchanged ELSE do nothing; busy and retry statuses are not forwarded; IF the read fails THEN write nothing and log the reason
    violation: none; opencode carries on
    source: FR1.2, NFR4
  - id: BR6.3
    statement: The adapter builds the reply's message only from the harness's own last-message field.
    category: validation
    applies_to: HarnessEventAdapter
    trigger: a raw event of kind reply
    logic: Claude Code text is last_assistant_message (the transcript is never read); opencode text is the last assistant message's text parts in order; cut at 64 KB by BR2.6; IF the text is empty or whitespace only THEN set empty; IF the payload has no last-message field at all THEN reject with a reason logged and show nothing
    violation: nothing shown; the session keeps waiting in the terminal
    source: FR1.1, FR1.2, FR2.7, FR6.2
  - id: BR6.4
    statement: The same message reported twice is one reply.
    category: constraint
    applies_to: AgentEventStore
    trigger: a reply arrives from a session whose newest reply is still waiting
    logic: IF its text equals that reply's text THEN ignore it (no new event, no page, no notification) ELSE handle it as a newer event (BR6.5)
    violation: none
    source: FR6.1
  - id: BR6.5
    statement: A newer event from the same session means the tab no longer waits for the older reply.
    category: policy
    applies_to: AgentEventStore
    trigger: any event (question, answered, permission or reply) from a session with an open reply
    logic: IF the older reply is shown THEN it becomes stale and keeps the person's typed text ELSE (queued or dismissed) it ends; IF the project's LatestMessage names it THEN its status becomes answered, unless the newer event is a reply, which replaces it (BR6.15)
    violation: none
    source: FR2.7, FR1.5
  - id: BR6.6
    statement: Typing in the tab's terminal answers the reply there.
    category: policy
    applies_to: AgentEventStore, IpcRouter
    trigger: the person's input reaches that tab's pty through the terminal (pty:write) after the reply arrived
    logic: treat it as a newer event from the session (BR6.5); the store's own typed answer does not pass through pty:write and never triggers this rule
    violation: none
    source: FR2.7
  - id: BR6.7
    statement: When the tab exits, its reply keeps its text but can no longer be answered.
    category: policy
    applies_to: AgentEventStore
    trigger: the session of an open reply closes (tab exit or restart)
    logic: IF the reply is shown THEN it becomes stale with the line "The <harness> session ended. Nothing was sent." ELSE it ends; IF the project's LatestMessage is from that session THEN its status becomes sessionEnded. For replies this replaces u1 BR2.3's "end every event of the session" on exit
    violation: none
    source: FR6.4, FR2.7
  - id: BR6.8
    statement: Replies are paged after questions and permission prompts.
    category: policy
    applies_to: AgentEventStore, AgentDialog
    trigger: the pager order is computed
    logic: every open question and permission event comes before every reply, whatever their arrival; inside each group BR2.1 applies; the page being read never jumps
    violation: none
    source: FR6.1
  - id: BR6.9
    statement: Every reply opens the dialog with the message and an empty answer field.
    category: policy
    applies_to: AgentEventStore, AgentDialog
    trigger: a reply event is queued
    logic: show it as a MESSAGE page titled "Message from <harness>", with project, tab and arrival time on the where line, the message rendered by BR4.1 (an empty message shows the app line "<harness> finished its turn without a message."), the "Shortened at 64 KB" line when truncated, and one empty answer field with focus; the agent's text is never guessed to be a question or not. u5 adds the reply setting that can skip opening
    violation: none
    source: FR2.7, FR2.1, FR2.2, FR6.2
  - id: BR6.10
    statement: Main accepts a reply's answer only while that tab still waits for it, and only once.
    category: authorization
    applies_to: AgentEventStore
    trigger: agentEvents.answer for a reply event
    logic: IF the event exists AND its kind is reply AND its state is shown AND its session is live AND the cleaned text (BR6.11) is 1 character to 64 KB THEN accept ELSE refuse with the named C4 error ("unknown event", "event not open", "session ended", "answer does not fit the event")
    violation: refused; nothing is typed anywhere
    source: FR3.1, FR2.7, NFR3
  - id: BR6.11
    statement: A reply's answer is typed as one line of plain text.
    category: validation
    applies_to: AgentEventStore, AgentDialog
    trigger: building the text to type
    logic: replace carriage return, line feed and tab with a space; remove every other control character, escape included, and delete; change nothing else (emoji, quotes and non-ASCII are kept)
    violation: none; an answer that is empty after cleaning keeps Send disabled
    source: NFR3, FR2.7
  - id: BR6.12
    statement: The answer is typed into the asking tab only, followed by Enter.
    category: policy
    applies_to: AgentEventStore, PtyManager
    trigger: an accepted reply answer
    logic: in one step with no other pty input in between, re-check that the reply is still shown, take ptyOf(sessionId), and write the cleaned text and one Enter to that pty; IF ptyOf is null THEN fail with "session ended"; on success the event ends, Answer.via is typed, the LatestMessage status becomes answered and the dialog shows "Sent to <harness> as typed, followed by Enter."
    violation: "session ended" or "send failed: <cause>"; nothing typed; BR3.4 keeps the text and allows retry
    source: FR2.7, FR3.1, FR3.5
  - id: BR6.13
    statement: A stale reply keeps the person's text and types nothing.
    category: policy
    applies_to: AgentDialog
    trigger: a shown reply becomes stale (BR6.5, BR6.6, BR6.7)
    logic: disable the answer field and Send, keep the typed text, show "<harness> is no longer waiting for this message. Your text is kept." (or the session-ended line of BR6.7) with Copy and Open the terminal; Close ends the event
    violation: none
    source: FR3.5, FR2.7
  - id: BR6.14
    statement: Closing a reply only dismisses it; the latest-message strip can open it again while the tab waits.
    category: policy
    applies_to: AgentEventStore, AgentDialog, LatestMessageStrip
    trigger: Close or Esc on a reply that is shown
    logic: type nothing, write no answer file, state dismissed, leave the pager, LatestMessage unchanged; the strip's Answer calls agentEvents.reopen and the reply is shown again in the same dialog with an empty answer field
    violation: reopen of a reply that is not dismissed is refused with "event not open"
    source: FR3.3, FR2.7, FR2.8
  - id: BR6.15
    statement: Each project keeps one latest message, the newest reply of any of its agent tabs.
    category: calculation
    applies_to: AgentEventStore
    trigger: a reply is accepted for a project
    logic: IF the project has no LatestMessage OR the reply arrived later (by arrivedAt, then tabId) THEN the LatestMessage becomes this reply with status waiting; status moves to answered (BR6.5, BR6.6, BR6.12) or sessionEnded (BR6.7); it is kept in memory only
    violation: none
    source: FR2.8
  - id: BR6.16
    statement: The latest-message strip shows the project's latest message in one line and opens it.
    category: policy
    applies_to: LatestMessageStrip
    trigger: the project view shows, or agent-events:changed arrives for its project
    logic: no LatestMessage shows "No message from the agent yet" with no buttons; otherwise tab name, arrival time and the first non-empty line rendered as inline Markdown by BR4.1, one line cut with an ellipsis, plus "(shortened)" when truncated; waiting shows Answer; answered adds "(answered)" and sessionEnded adds "(session ended)" after the tab name, and both show Show, which opens the M4 layout read-only from the LatestMessage text
    violation: none
    source: FR2.8, FR2.2, FR6.2
  - id: BR6.17
    statement: A waiting reply turns red after 20 seconds, like a question.
    category: policy
    applies_to: AgentDialog
    trigger: a reply page is shown for 20 s without Send
    logic: switch to the overdue style and title as BR4.6 does for questions [Q1]; a dismissed or stale reply never escalates; a reopened reply starts its 20 s again
    violation: none
    source: FR5.1
  - id: BR6.18
    statement: Without current hooks there are no replies.
    category: policy
    applies_to: AgentEventStore, LatestMessageStrip
    trigger: a harness's hooks or plugin are not current for the project (BR2.7)
    logic: its tabs produce no reply events; the strip shows its empty state for them; the fallback audit-log questions are unchanged
    violation: none
    source: FR4.5
```

## Summary

| Rule | In short |
|---|---|
| BR6.1 | Stop hook writes the reply and exits 0 at once, silently |
| BR6.2 | opencode plugin forwards idle top-level sessions with the last message |
| BR6.3 | Message only from the harness's last-message field; 64 KB; empty flagged |
| BR6.4 | The same message twice is one reply |
| BR6.5 | A newer event from the session makes the older reply stale or ends it |
| BR6.6 | Typing in the terminal counts as answering there |
| BR6.7 | Tab exit: a shown reply goes stale with the session-ended line |
| BR6.8 | Replies come after questions and permission prompts |
| BR6.9 | Every reply opens the dialog with the message and an empty field |
| BR6.10 | Answer check: shown, live, fits, once |
| BR6.11 | One clean line: no control characters |
| BR6.12 | Typed with Enter into the asking tab only, checked in the same step |
| BR6.13 | Stale reply: field disabled, text kept, Copy and Open the terminal |
| BR6.14 | Close dismisses; the strip's Answer reopens |
| BR6.15 | One latest message per project, newest of any tab |
| BR6.16 | Strip: empty, waiting, answered and session-ended states |
| BR6.17 | Red after 20 s like a question `[Q1]` |
| BR6.18 | No hooks, no replies; fallback unchanged |
