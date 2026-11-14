# Business Rules: u2-permissions

## Sources

- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (FR1.1, FR1.2, FR2.1, FR3.2, FR3.3, FR3.4, FR3.6, FR6.1, FR6.2, NFR1–NFR3, NFR5–NFR7).
- Stories: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md` (US2.1, AC2.1.1–AC2.1.4).
- Unit: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work.md`, `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work-story-map.md`.
- Components: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/components.md`.
- Contracts: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1, C3, C4).
- Mockups: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/refined-mockups/mockups.md` (M3, M6).
- Integration point: `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/rules.md` (BR1–BR4, reused by name and not restated).
- Answers: `functional-design-questions.md` (no questions for this Unit).

u1's rules apply to permission events unless a rule below says otherwise: BR1.1 (channel check), BR1.2 (app gone), BR1.3 (wait limit), BR2.1 (no jump), BR2.4 (start-up), BR2.5 (context), BR2.7 (source choice), BR3.4 (failed send), BR4.5 (keyboard, except the focus rule in BR5.6) and BR4.6 (escalation). BR2.2, BR3.1, BR3.2, BR3.3 and BR3.5 are question rules; BR5.7, BR5.8 and BR5.10 are their permission counterparts.

```yaml
rules:
  # BR5 permission prompts
  - id: BR5.1
    statement: A Claude Code permission request becomes a permission event built only from fields the adapter knows.
    category: validation
    applies_to: ClaudeCodeHook, HarnessEventAdapter
    trigger: a raw event of kind permission from a Claude Code session (PermissionRequest hook entry, any tool)
    logic: IF tool_name is a non-empty text AND tool_input is an object THEN what = tool_name; detail = tool_input.command for a shell tool, tool_input.file_path for a file tool, otherwise tool_input as indented JSON text; cwd = the hook input's cwd; alwaysRules = permission_suggestions unchanged (empty when absent) ELSE refuse with a reason logged (BR5.4)
    violation: nothing shown; the prompt is handed back at once (BR5.4)
    source: FR1.1, FR2.1
  - id: BR5.2
    statement: An opencode permission.asked becomes a permission event, and permission.replied closes it, whichever side answered.
    category: validation
    applies_to: OpencodePlugin, HarnessEventAdapter, AgentEventStore
    trigger: the plugin receives permission.asked or permission.replied
    logic: on permission.asked the plugin writes a C1 event of kind permission with the event body unchanged; the adapter sets what from the permission type, detail from its pattern or command, toolCallId = requestID. On permission.replied the plugin writes an answered event with that requestID; the store ends the matching permission event
    violation: an unreadable permission.asked is refused (BR5.4); opencode's own terminal prompt is unaffected
    source: FR1.2, FR2.1
  - id: BR5.3
    statement: The choices are the agent's own, in its order, and nothing else.
    category: policy
    applies_to: HarnessEventAdapter
    trigger: building Permission.choices
    logic: Claude Code - Allow once (allowOnce); Allow always (allowAlways) only IF alwaysRules is not empty, one choice that applies all of them, only IF every suggestion is an `addRules` with `behavior: "allow"` or an `addDirectories` with no unknown key, its label naming each rule or folder with its destination; disabled when the lines exceed the caps (security-design.md SD11); Deny (deny). opencode - Allow once (once); Allow always (always) only IF the request carries a non-empty list of always-patterns that fits the caps, its label naming each pattern as `<permission>: <pattern>`; Reject (reject). refuses is true for the deny choice only
    violation: none
    source: FR2.1, FR3.2
  - id: BR5.4
    statement: A permission event the app will not show is handed back at once, never left waiting.
    category: policy
    applies_to: AgentEventStore, AgentChannel
    trigger: the adapter refuses a permission payload, the tool is the question tool (AskUserQuestion), or the project's source for that harness is the fallback (BR2.7)
    logic: write an empty answer file for that event file right away, log the reason, show nothing
    violation: none; Claude Code shows its own prompt, opencode's terminal prompt stays
    source: FR3.4, NFR5
  - id: BR5.5
    statement: What the agent wants to do is shown as plain text, whole, and a cut command cannot be allowed.
    category: validation
    applies_to: HarnessEventAdapter, AgentDialog
    trigger: building and rendering Permission.detail
    logic: never render detail as Markdown or HTML; show control characters other than newline and tab as visible escapes; IF detail is longer than 64 KB THEN cut on a character boundary, set truncated, and set enabled false on the allow choices (Deny, Close and Open the terminal stay)
    violation: the allow choices stay disabled with the line "Shortened at 64 KB. The full text is in the terminal."
    source: FR6.2, NFR3
  - id: BR5.6
    statement: The app never allows or denies on its own.
    category: authorization
    applies_to: AgentDialog, AgentEventStore, HarnessEventAdapter, OpencodePlugin
    trigger: a permission page opens, a timer runs out, a setting or earlier answer exists
    logic: no choice is preselected; focus goes to the page title, not a choice; Enter does nothing until a choice has focus by number key, Tab or arrow; a click on a choice or Enter on a focused choice is the only send; no timer, setting, remembered choice or rule ever produces an Answer; Close, Esc and time-out send neither allow nor deny; the opencode plugin never sets an evaluate effect
    violation: nothing is sent
    source: FR3.4, NFR3
  - id: BR5.7
    statement: Main accepts a permission answer only for a waiting permission of a live session, only if it fits, and only once.
    category: authorization
    applies_to: AgentEventStore
    trigger: agentEvents.answer for a permission event
    logic: IF the event exists AND its kind is permission AND its state is shown AND its session is live AND its hook is still waiting AND answer.choice is an index of an enabled choice THEN accept and set state sending ELSE refuse with the named C4 error
    violation: refused; nothing reaches any agent
    source: FR3.1, FR3.4, NFR3
  - id: BR5.8
    statement: A permission answer goes back only through the waiting hook, exactly as the chosen choice.
    category: calculation
    applies_to: HarnessEventAdapter, AgentEventStore, OpencodePlugin
    trigger: an accepted permission answer
    logic: Claude Code - allowOnce gives decision behavior allow; allowAlways gives behavior allow with updatedPermissions = alwaysRules unchanged; deny gives behavior deny with interrupt true and a fixed message that the person denied it in the app; updatedInput is never set. opencode - the answer file holds once, always or reject; the plugin calls permission.reply with that decision. Never as keys
    violation: if the answer file cannot be written or the hook stopped waiting, the answer fails as BR3.4 (state shown while the hook still waits, else timedOut) and nothing is allowed
    source: FR3.2, FR3.4, NFR1, NFR2
  - id: BR5.9
    statement: When the hook's wait runs out, the prompt goes back to the terminal and the dialog only says so.
    category: policy
    applies_to: AgentEventStore, AgentDialog
    trigger: waitSeconds passed for a queued or shown permission (BR1.3), or a send found the hook no longer waiting
    logic: state timedOut; every choice disabled; line "<harness> stopped waiting for the dialog. Answer in the terminal." with Open the terminal and Close; the event ends on Close, the next event from the same session, or exit
    violation: none
    source: FR3.6, FR3.4, NFR5
  - id: BR5.10
    statement: Closing a permission hands it back to the terminal without a decision.
    category: policy
    applies_to: AgentEventStore, AgentDialog
    trigger: Close or Esc on a shown permission
    logic: write an empty answer file (Claude Code shows its own prompt; the opencode plugin stops waiting and replies nothing); state handedBack, then ended at once; toast "Handed back to the terminal. Answer there as usual." for 5 s
    violation: none
    source: FR3.3, FR3.4
  - id: BR5.11
    statement: Permissions are answered one by one, and the first answer wins.
    category: constraint
    applies_to: AgentEventStore, OpencodePlugin
    trigger: several permission events from one session, or an opencode answer from the terminal and the dialog together
    logic: a newer event from the same session does not end a permission whose hook still waits; each ends by its own answer, close, time-out, permission.replied or exit. The plugin calls permission.reply only IF no permission.replied has been seen for that requestID; IF permission.replied arrives for an event the app did not send THEN end it with the line "Answered in the terminal."; IF permission.reply fails THEN the plugin writes an answered event marked failed and the store sets timedOut with lastError
    violation: none; never two decisions for one request
    source: FR3.2, FR6.1
  - id: BR5.12
    statement: Questions and permission prompts come before replies in the pager.
    category: policy
    applies_to: AgentEventStore
    trigger: an event arrives or leaves
    logic: order by kind rank (question and permission 0, reply 1), then arrivedAt, then tabId; BR2.1 still holds, so a page being read never jumps and a new event only raises the count
    violation: none
    source: FR6.1
  - id: BR5.13
    statement: A permission page looks like M3 and names its kind in text.
    category: policy
    applies_to: AgentDialog
    trigger: rendering a permission event
    logic: amber header with the word PERMISSION and "<harness> asks for permission"; project and tab; what and detail in a monospaced block; cwd when given; choices in the agent's order with number keys; refusing choices below a rule with a coral edge; every app text through t(); BR4.6 escalation applies
    violation: none
    source: FR2.1, NFR1, NFR6, NFR7
```

## Summary

| Rule | In short |
|---|---|
| BR5.1 | Claude Code PermissionRequest read from known fields; suggestions kept as is |
| BR5.2 | opencode permission.asked opens, permission.replied closes |
| BR5.3 | Only the agent's own choices; Allow always only when Claude Code suggests a rule |
| BR5.4 | Refused or unhandled permission events hand back at once |
| BR5.5 | Plain text, 64 KB, no allow on a cut command |
| BR5.6 | Never decided by the app: no preselection, no auto-send |
| BR5.7 | Answer check: waiting, live, fits, once |
| BR5.8 | Via hook only; allow, allow with the agent's rules, or deny; never keys |
| BR5.9 | Time-out hands back; choices disabled |
| BR5.10 | Close hands back without a decision |
| BR5.11 | Several per session; first answer wins in opencode |
| BR5.12 | Questions and permissions before replies |
| BR5.13 | M3 layout, kind in text |
