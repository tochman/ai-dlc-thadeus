# Refined Mockups: agent dialogs (EPIC-05 US-0506)

## Sources

- User stories: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md` (US1.1–US5.1).
- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (FR1–FR6, NFR1–NFR8).
- Team practices: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/practices-discovery/team-practices.md` (every text through `t()`, `data-testid` as `<component>-<role>`).
- Today's dialog: `src/renderer/QuestionPopup.jsx` and the `.question-popup*` rules in `src/renderer/theme.css` (US-0505).
- Answers: `refined-mockups-questions.md` Q1–Q5 `[Q1]`…`[Q5]`.
- No rough mockups exist: the classic plan has no Ideation phase, so these mockups start from the stories and requirements.

## Screens at a glance

| Screen | Story | What it is |
|---|---|---|
| M1 Question dialog, single question | US1.1 | Today's dialog, rebuilt on the agent's own question |
| M2 Question dialog, batch | US1.1 | Up to four questions stacked, each collapsing once answered `[Q1]` |
| M3 Permission dialog | US2.1 | Same dialog, amber "Permission" header `[Q2]` |
| M4 Reply dialog | US3.1 | Same dialog, quieter steel header "Message from <agent>" `[Q3]` |
| M5 Latest-message strip | US3.1 | One line above the agent terminal panel `[Q4]` |
| M6 Hand-back and failure states | US1.1, US2.1, US3.1 | Lines inside M1–M4 |
| M7 Fallback notice strip | US4.1 | Project view strip when hooks or plugin are missing or out of date `[Q5]` |
| M8 Install / update preview | US4.1 | Diff dialog before anything is written `[Q5]` |
| M9 Settings: replies | US5.1 | New row beside `questionAlerts` in Settings |

All dialogs keep US-0505's frame: 640 px wide (`min(640px, 92vw)`), LCARS header bar with a rounded right end, calm at first, red after 20 seconds, and the pager and actions in the footer.

## M1 Question dialog, single question

```
+----------------------------------------------------------------+
| [ QUESTION ]  Claude Code is waiting for you             ====) |
| AIDLC-DASH . CLAUDE CODE . AGENT DIALOGS . USER STORIES        |
|                                                                |
|  ## User Stories complete                                      |
|  How would you like to proceed?          (rendered Markdown)  |
|                                                                |
|  +----------------------------------------------------------+  |
|  | 1  Complete workflow                                     |  |
|  |    Continue to Refined Mockups                           |  |
|  +----------------------------------------------------------+  |
|  | 2  Request Changes                                       |  |
|  |    Provide revision feedback                             |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Your own answer: [______________________________] [ Send ]   |
|                                                                |
|----------------------------------------------------------------|
|  < Previous   1 of 2   Next >     [ Open the terminal ] [Close]|
+----------------------------------------------------------------+
```

- **Header bar:** kind label in a dark pill ("QUESTION"), then "<harness> is waiting for you". After 20 s: "<harness> is still waiting for you", red bar (US-0505).
- **Where line:** project, tab (harness name), and, when an AI-DLC gate is open for the session's intent, the intent and stage (FR1.4). Upper case, `--steel-meta`.
- **Question text:** sanitized Markdown (FR2.2), up to 64 KB, the body scrolls inside the dialog; the header, where line and footer stay put.
- **Options:** one button per option, number key on the left, label in the read font, description beneath in `--text-2` (FR2.3). The options are exactly the agent's, in the agent's order.
- **Own answer:** shown only when the agent's question allows it (FR2.6); its placeholder names what the agent calls it ("Type something" for Claude Code, "Other" for opencode).
- **Footer:** pager over all open events (FR6.1), Open the terminal, Close (hands the question back, FR3.3).

## M2 Question dialog, batch `[Q1]`

```
+----------------------------------------------------------------+
| [ QUESTIONS 4 ]  Claude Code is waiting for you          ====) |
| AIDLC-DASH . CLAUDE CODE                                       |
|                                                                |
|  v Feature docs .............. B. Keep one story      [Change] |   <- answered, collapsed
|  v Story cut ................. A. Slice per event kind [Change]|   <- answered, collapsed
|                                                                |
|  Story size                                     (open)         |
|  How large should each story be?                               |
|  | 1  A. Small        About 1-3 days each ...              |   |
|  | 2  B. Medium       About 3-5 days each ...              |   |
|  | 3  C. Large        One story per functional area ...    |   |
|  Your own answer: [_____________________]                      |
|                                                                |
|  > Proof ...................... not answered yet               |   <- waiting, collapsed
|                                                                |
|  2 of 4 answered                       [ Send all answers ]    |  <- disabled until 4 of 4
|----------------------------------------------------------------|
|  < Previous   1 of 1   Next >     [ Open the terminal ] [Close]|
+----------------------------------------------------------------+
```

- Every question of the batch is on one scrollable page, in the agent's order, each under its header (FR2.4).
- Picking an option (or ticking and pressing Done in a multi-select one) collapses that question to one line: header, the chosen label(s), and Change. Focus moves to the next unanswered question.
- The first unanswered question is open; the others are collapsed with "not answered yet".
- **Send all answers** is enabled only when every question has an answer; until then a line under it reads "<n> of <total> answered". One send delivers all answers together.
- **Multi-select question:** each option has a checkbox square (not only colour) at the left; a Done button under the options collapses it with the ticked labels joined by commas.

## M3 Permission dialog `[Q2]`

```
+----------------------------------------------------------------+
| [ PERMISSION ]  Claude Code asks for permission          ====) |   <- amber bar
| AIDLC-DASH . CLAUDE CODE                                       |
|                                                                |
|  Claude Code wants to run:                                     |
|  +----------------------------------------------------------+  |
|  | npx vitest run tests/main/questions.test.js              |  |   <- code block, mono
|  +----------------------------------------------------------+  |
|  in /Users/.../aidlc-dash                                      |
|                                                                |
|  | 1  Allow once                                            |  |
|  | 2  Allow always for this command in this project         |  |
|                                                                |
|  ------------------------------------------------------------  |
|  | 3  Deny                                                  |  |   <- set apart, coral edge
|                                                                |
|----------------------------------------------------------------|
|  < Previous   2 of 2   Next >     [ Open the terminal ] [Close]|
+----------------------------------------------------------------+
```

- Header bar `--amber` with black text and the label "PERMISSION"; never the steel of a question, so the two cannot be mistaken even before reading (text names the kind too, NFR6).
- What the agent wants to do is shown as the agent reported it, in a code block (`--font-mono`), with its working folder when the agent gives one.
- The choices are the agent's own, in its order. Deny, or any refusing choice, sits below a rule with a coral left edge.
- No choice is preselected and Enter does nothing until a choice has focus (FR3.4: every allow is a click or key press by the person).
- After 20 s the bar turns red like a question (US-0505 escalation).

## M4 Reply dialog `[Q3]`

```
+----------------------------------------------------------------+
| [ MESSAGE ]  Message from Claude Code                    ====) |   <- quieter steel-deep bar
| AIDLC-DASH . CLAUDE CODE . 15:42                               |
|                                                                |
|  Which name should the file have?        (rendered Markdown)  |
|                                                                |
|  Your answer: [_________________________________] [ Send ]     |
|  Sent to Claude Code as typed, followed by Enter.              |
|                                                                |
|----------------------------------------------------------------|
|  < Previous   1 of 1   Next >     [ Open the terminal ] [Close]|
+----------------------------------------------------------------+
```

- Same modal and frame as questions; header bar `--steel-deep` with `--steel-light` text, label "MESSAGE", title "Message from <harness>", and the arrival time on the where line.
- The whole last message is rendered as Markdown; the answer field is always present (FR2.7).
- Close dismisses only; the message stays in the latest-message strip (FR3.3). It escalates to red after 20 s like the other kinds (`[Q3]` chose the same modal, not the never-red variant).
- **Stale reply:** if the tab started a new turn, was answered in the terminal, or exited before Send, the answer field is disabled, the typed text is kept, and a line says "Claude Code is no longer waiting for this message. Your text is kept." with Copy and Open the terminal. Nothing is typed into a tab that is not waiting.

## M5 Latest-message strip `[Q4]`

```
+-- project view ------------------------------------------------+
| ...intent list / detail...                                     |
|                                                                |
| [MSG] CLAUDE CODE . 15:42  Which name should the file have?   |
|                                            [ Answer ] [ Show ] |
|+--------------------------------------------------------------+|
|| [Claude Code] [opencode] [Shell]                     tabs     ||
|| terminal ...                                                 ||
```

- One line directly above the agent terminal panel: tab name, time, the first line of the newest reply (plain text, cut with an ellipsis), Answer (opens M4) and Show (opens M4 read-only when the tab is no longer waiting).
- With two agent tabs, the strip shows the newest reply of either tab and names its tab.
- **Empty:** before any reply since the app started, the strip reads "No message from the agent yet" in `--muted`, with no buttons.
- **Tab exited:** the strip keeps the message, adds "(session ended)" after the tab name, and Answer becomes Show.

## M6 Hand-back and failure lines (inside M1–M4)

| State | Line in the dialog | Controls |
|---|---|---|
| Closed by the person (question or permission) | "Handed back to the terminal. Answer there as usual." | Dialog closes; line shown as a toast in the project view for 5 s |
| Hook time limit ran out | "Claude Code stopped waiting for the dialog. Answer in the terminal, or send from here as keys." | Choices stay enabled; a send now presses the picker's keys |
| Send failed | One sentence naming the cause (session ended, hook timed out, agent refused) | Typed answer kept; Open the terminal |
| Session ended | "The Claude Code session ended. Nothing was sent." | Choices disabled; Close |
| App restarted while waiting | Nothing is shown: questions from before the start are not listed | — |
| Text cut at 64 KB | "Shortened at 64 KB. The full text is in the terminal." at the end of the text | Open the terminal |

All lines use `role="status"`; failures use `--coral-soft` text and an "!" mark, never colour alone.

## M7 Fallback notice strip `[Q5]`

```
| [!] Agent dialogs use the terminal fallback: the app's hooks are missing   |
|     in .claude/settings.json.                     [ Install ] [ Details ] |
```

- Shown at the top of the project view when the Claude Code hooks or the opencode plugin are missing or out of date (FR4.5). "Out of date" reads "...the app's hooks are out of date" with Update.
- Details opens Project settings at the Agent dialogs section, which shows the same status for each file (present and current, out of date, missing, edited by hand) with Install / Update / Remove.
- The strip can be dismissed for this app run; it comes back next start while the hooks are missing.

## M8 Install / update preview `[Q5]`

```
+----------------------------------------------------------------+
| [ INSTALL ]  Add agent dialogs to this project           ====) |
|                                                                |
|  These files are committed and shared with your team.          |
|  Teammates without the app are not affected.                   |
|                                                                |
|  .claude/settings.json   (2 entries added, others unchanged)   |
|  +----------------------------------------------------------+  |
|  |   "hooks": {                                             |  |
|  | +   "PreToolUse": [ { ...thadeus-dialog... } ],          |  |
|  | +   "Stop": [ { ...thadeus-dialog... } ]                 |  |
|  |     ...AI-DLC entries unchanged...                       |  |
|  +----------------------------------------------------------+  |
|  .thadeus/hooks/dialog.sh   (new file)          [ Show file ]  |
|  .opencode/plugin/thadeus-dialog.js   (new file) [ Show file ] |
|                                                                |
|                                     [ Cancel ]  [ Install ]   |
+----------------------------------------------------------------+
```

- One section per file with its path, a one-line summary, and a unified diff (added lines `+` on `--steel-deep`, removed `-` on a coral tint, each with the sign as well as the colour).
- The file and folder names shown here are placeholders; Functional Design fixes the real ones (FR4.6, FR4.7).
- **Changed since preview:** Install reads the files again; if one changed, the dialog stays open and says "<file> changed since this preview. Look at the new preview." with the diff refreshed.
- **Cannot write / not valid JSON:** "Nothing was written: <file> is not valid JSON." (or the reason), in one sentence.
- Remove uses the same dialog with title "Remove agent dialogs from this project" and only `-` lines.

## M9 Settings: replies

In Settings > Appearance, under "Question alerts" (US-0505), a new row:

```
Messages from the agent   ( ) Dialog and notification   ( ) Line only   ( ) Off
                          Questions and permission prompts follow Question alerts.
```

Radio group, default "Dialog and notification" (FR5.2).

## Mapping to stories

| Story | Screens |
|---|---|
| US1.1 | M1, M2, M6 |
| US2.1 | M3, M6 |
| US3.1 | M4, M5, M6 |
| US4.1 | M7, M8 |
| US5.1 | M9, plus the escalation in M1–M4 and the system notification (interaction-spec.md) |
