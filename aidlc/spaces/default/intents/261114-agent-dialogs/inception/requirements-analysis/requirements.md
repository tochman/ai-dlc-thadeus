# Requirements: agent dialogs (EPIC-05 US-0506)

## Sources

- Initial description: "US-0506: nu fokuserar vi på user story som handlar om hur dialogerna formatteras och kommunicerar med claude (men även andra ai-klienter). Det här är högprioriterat utifrån användarvärde. We still have errors on the popup dialogs (screenshot 15.13.46: Could not send: Claude shows other choices than the ones AI-DLC logged). We really need to take another spin at this in a real full plan." `[desc]`
- Workflow-selected scope: classic `[scope]`
- Story: `docs/features/epic-05-workflow-control.md` US-0506, with US-0505, US-0801 and US-0803 as dependencies.
- Code knowledge base: `aidlc/spaces/default/codekb/aidlc-dash/` (architecture.md, business-overview.md, code-structure.md, api-documentation.md, component-inventory.md).
- Team practices: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/practices-discovery/team-practices.md` (TDD, 80% line coverage in CI, ESLint and Prettier in CI, one squash-merged PR per story).
- Answers: `requirements-analysis-questions.md` Q1–Q8 `[Q1]`…`[Q8]`.

## Intent analysis

The person runs an agent (Claude Code or opencode) in the app's console while doing other things. Today the dialog only knows AI-DLC's questions, learns them from the audit log, and answers by reading Claude Code's picker off the screen and pressing a key. It breaks whenever the logged options and the options on screen differ ("Could not send"). It cannot answer a question asked as plain chat text, never sees the agent's own questions or permission prompts, and shows option labels without their descriptions. `[desc]`

The goal is a dialog the person can trust: every time the agent in an app tab needs them, the dialog shows exactly what the agent shows, formatted so it can be read, and the answer reaches that agent, the first time, with no detour through the terminal. This holds for Claude Code and opencode alike. `[Q1]` `[Q5]`

Success means:
- no "Could not send" for a question the agent is actually showing;
- no question left in the dialog after the agent stopped waiting for it;
- the person can run a whole AI-DLC workflow, gates included, from the dialog alone.

**Type:** enhancement that replaces the question pipeline. **Scope:** multi-component (main, preload, renderer, shared tables, and one script per harness). **Complexity:** complex. **Depth:** Standard.

## Functional requirements

### FR1 Events from the agent, not from the screen

- **FR1.1** For Claude Code, the app learns about every question, permission prompt and finished reply from Claude Code's hooks, not from AI-DLC's audit log or the terminal screen. The question text, its options with labels and descriptions, its header, whether several options can be picked, and the batch it belongs to come from the hook's own data. `[Q2]` Each kind has one source event:

  | Kind | Claude Code source | opencode source |
  |---|---|---|
  | Question | the hook that fires before its question tool runs, carrying the tool's questions | the plugin event for its question tool |
  | Permission prompt | the hook that fires when it asks for permission | the plugin's permission event |
  | Reply (the agent finished its turn and waits for the person) | the hook that fires when the agent stops, with the last assistant message from its transcript | the plugin's session-idle event with the last message |

  The exact hook and event names are fixed in Functional Design against the installed versions (Open questions).
- **FR1.2** For opencode, the app learns the same three kinds from opencode's plugin and event API. `[Q5]`
- **FR1.3** Every event is tied to the agent tab whose session sent it. An event from a session the app did not start is ignored by the app, and the hook lets that session carry on as if the hook were not installed. `[Q8]`
- **FR1.4** AI-DLC's audit log adds context only: when the session's active intent has an open AI-DLC question or gate, the dialog shows the project, intent and stage beside the question. The audit log never adds, removes or changes an option. `[Q2]`
- **FR1.5** A question leaves the dialog when its own session reports it answered, the session moves on (a new event, a finished reply), or the tab exits. Waiting for a later AI-DLC audit event is no longer needed.
  - Given an open question, when the person answers it in the dialog and the agent continues, then the question is gone from the dialog within 1 second of the agent's next event.
  - Given an open question, when the agent tab exits, then its questions are removed and nothing is sent.

### FR2 What the dialog shows `[Q1]` `[Q6]`

- **FR2.1** Kinds: a question (with options), a permission prompt (with the agent's own choices, for example allow once, allow always for this, deny), and a reply: the agent finished its turn and waits for the person, with its last message. "The agent is waiting for you" and "the agent's latest message" from US-0506 are the same event, a reply, because a Claude Code or opencode session that has finished its turn always waits for the person's next input. One dialog serves all three. Each shows its project, its tab (harness name) and its kind.
- **FR2.2** The question text and the agent's message are rendered as Markdown: headings, lists, emphasis, inline code and code blocks, and links that open in the system browser only after the person clicks. Raw HTML in the text is shown as text, never rendered. Script, style and event-handler content never runs.
- **FR2.3** Each option shows its label and, beneath it, its description, when the agent gave one.
- **FR2.4** A batch (up to four questions sent together) is shown in one dialog, each question with its header, and is answered and sent together.
- **FR2.5** A multi-select question lets the person tick several options and confirm. A single-select question takes one pick.
- **FR2.6** Every question that allows it also has an own-answer field, as the agent's own picker does ("Type something" / "Other").
- **FR2.7** A question asked in plain chat text (no picker, no structured question) arrives as a reply. The app does not try to guess whether a reply is a question: every reply opens the dialog with the message and an answer field, and the answer is typed into that agent's tab and submitted with Enter. `[Q7]` With the reply setting (FR5.2) on "line only", a reply does not open the dialog: it updates the latest-message line, whose Answer button opens the same dialog.
  - Given an app tab where Claude Code ends its turn with "Which name should the file have?", when the reply event arrives, then the dialog opens with that message rendered and an empty answer field; when the person types "notes.md" and sends, then "notes.md" and Enter are typed into that tab only.
  - Given an app tab where Claude Code ends its turn with "Done. All 353 tests pass.", when the reply event arrives, then the dialog opens with the message and an answer field; when the person closes it, then nothing is typed, the session keeps waiting in the terminal, and the message stays in the latest-message line.
- **FR2.8** Latest message: per project, the agent's last reply is shown as a "latest message" line in the project view, rendered by FR2.2, with the time it arrived and an Answer button. The full history stays in the terminal.

### FR3 Sending the answer

- **FR3.1** The answer goes only to the session that asked: a question id from FR1.3 identifies the session, and main refuses an answer for an unknown, finished or other session's question.
- **FR3.2** A pick, a set of picks, a permission choice or an own answer reaches the agent exactly as if the person had answered in the terminal: same option, same text, once. Where the harness lets a hook return the answer, it is returned that way. Where it does not, the app presses the agent's own keys, computed from the exact options the hook reported, never from the audit log.
  - Given the 2026-11-14 case (AI-DLC logged "Approve / Request changes", the picker showed "Complete workflow / Request Changes"), when the person picks the first option in the dialog, then "Complete workflow" is chosen in Claude Code.
- **FR3.3** While the dialog shows a question or permission prompt from a session, that session waits for the dialog: the dialog takes over until it is answered or closed. Closing it hands the question back to the terminal, where the person answers as usual, and says so in one line. `[Q4]` A reply holds nothing: the session is already waiting for input, and closing a reply's dialog only dismisses it (FR2.7).
- **FR3.6** If a hook cannot return the person's answer itself (Open questions), the app presses the agent's own keys computed from the hook's exact options (FR3.2). If a hook cannot wait as long as a person needs, the dialog still opens, and when the hook's limit runs out the question is handed back to the terminal as in FR3.3, and the dialog says so; the dialog's answer is then sent as keys while the agent's own picker is showing.
- **FR3.4** Permission prompts are never answered by the app on its own. Every allow or deny is a click by the person. `[desc]`
- **FR3.5** When sending fails (the session ended, the hook timed out, the agent refused the answer), the dialog says what happened in one sentence, keeps the person's typed answer, and offers Open the terminal.

### FR4 Installing the hooks and the plugin `[Q3]`

- **FR4.1** The app offers to install its Claude Code hooks into the project's shared, committed settings (`.claude/settings.json`) and its opencode plugin into the project's opencode plugin location, so every teammate's checkout carries them.
- **FR4.2** Before writing, the app shows exactly what it will add (the entries and the file), and that the file is committed and shared with the team. Nothing is written without the person's yes.
- **FR4.3** The app adds only its own entries, marked as the app's, and leaves every other entry untouched, AI-DLC's hooks included. It can show whether its entries are present and current, update them, and remove them, again after a preview.
- **FR4.4** A session that was not started by the app (a teammate without the app, the person's own terminal, CI) is unaffected by the installed hooks: the hook returns at once, adds nothing to the agent's context, and blocks nothing. `[Q8]`
- **FR4.6** The committed hook entry runs a script that is committed with it, in a folder of the app's own in the project (the folder name is fixed in Functional Design). The command in the entry first checks the app's session value (FR1.3) itself and exits with status 0 and no output when it is absent, before the script is even looked for. So a checkout that has the entry but neither the app nor the script, or a session the app did not start, runs nothing and blocks nothing. The script needs only what macOS and Linux provide by default (no Node.js, no app binary).
  - Given a teammate's checkout with the hook entry in `.claude/settings.json`, no app installed and the script folder deleted, when Claude Code fires the hook, then the hook exits 0 with no output within 100 ms and Claude Code carries on exactly as without the entry.
- **FR4.7** Installing fails safely: when `.claude/settings.json` is missing, the app creates it with only its own entries; when it is not valid JSON or cannot be written, the app writes nothing, names the file and the reason in one sentence, and keeps the fallback (FR4.5). The app reads the file again just before writing and writes nothing if it changed after the preview (for example AI-DLC rewrote it), asking the person to look at the new preview. For opencode, the plugin goes in the project's opencode plugin folder (the exact path is fixed in Functional Design against the installed opencode version), with the same preview, failure and change rules.
- **FR4.5** When the hooks or plugin are missing or out of date, the project shows that the dialog falls back to today's behaviour, with an Install / Update action. The fallback is today's audit-log question source and screen-read answer, unchanged.

### FR6 Corner conditions

- **FR6.1** Several events at once: events from different tabs or projects queue in arrival order, each with its own dialog page (the existing pager). A question or permission prompt is shown before a reply that arrived earlier. Each event gives at most one notification.
- **FR6.2** Size and characters: question text and replies up to 64 KB are shown in full, scrollable; longer text is cut at 64 KB with a line saying it was cut and that the full text is in the terminal. Text is carried between hook and app in a format that keeps every character (newlines, quotes, non-ASCII, emoji, control characters) and is escaped for display (FR2.2).
- **FR6.3** The app restarts or quits while a hook waits: the hook notices the app is gone within 2 seconds and hands the question back to the terminal (NFR5). After a restart, the app does not show questions it can no longer answer; it shows only events that arrive after it started.
- **FR6.4** The agent tab is restarted or exits while its question is open: the question is removed (FR1.5) and the dialog says in one line that the session ended.

### FR5 Notifications and settings

- **FR5.1** Escalation and settings work as in US-0505: calm, then red after 20 s; popup and notification, popup only, or off (`questionAlerts`), with the sound setting.
- **FR5.2** A separate setting for replies: "dialog and notification" (default), "line only" (FR2.7), or "off" (replies update the latest-message line only, with no notification). Questions and permission prompts follow `questionAlerts`.
- **FR5.3** A system notification is shown for a new question, permission prompt or reply (by FR5.1 and FR5.2) when the app is in the background or showing another project, once per event. Clicking it brings the app forward with that dialog open.

## Non-functional requirements

- **NFR1 Latency:** a question or permission prompt from an app tab appears in the dialog within 1 second of the hook firing, and an answer reaches the hook (or the keys reach the pty) within 1 second of the click. Measured on the release Mac (the MacBook Pro the person builds and checks releases on) with the app's development timing log, which stamps hook received, dialog shown, answer clicked and answer delivered; 20 runs, every run within the limit.
- **NFR2 Correctness:** the option the agent receives is the option the person picked in 100% of the acceptance scenarios: (1) labels that differ from AI-DLC's logged labels (the 2026-11-14 case), (2) options in a different order than logged, (3) a batch of four questions, (4) a multi-select question with two picks, (5) an own answer instead of an option, (6) a permission prompt allowed once, allowed always and denied, (7) a plain-text question answered from a reply. Each scenario runs once against Claude Code and once against opencode.
- **NFR3 Safety:** the local channel between hook and app accepts events only from sessions the app started (a per-session secret the app gives the session at spawn); text from the agent is shown as text or sanitized Markdown, never as HTML; links open only on click and only for `http`/`https`; no answer is sent without a person's action.
- **NFR4 No harm when the app is absent:** with the app closed or the session not the app's, the hook adds no more than 100 ms to the agent's step and never changes its behaviour or output.
- **NFR5 Robustness:** if the app does not answer within the hook's time limit, the hook gives the question back to the agent's own prompt in the terminal; the agent never hangs. A crash or restart of the app never leaves a session blocked.
- **NFR6 Accessibility:** the dialog is fully usable by keyboard (number keys pick, Space ticks in multi-select, Enter sends, Esc closes), focus moves into the dialog when it opens, and kinds and states are named in text, never by colour alone.
- **NFR7 Localization:** every app text is in `sv.json` and `en.json` through `t()`. The agent's own question text is shown as the agent sent it.
- **NFR8 Quality gates:** new behaviour is built test first. Line coverage of the touched code is at least 80%, checked in CI, and ESLint and Prettier pass in CI (team practices). The hook and plugin scripts have their own tests.

## Constraints

- Claude Code is configured through its hooks in `.claude/settings.json`, a file AI-DLC also writes its own hooks into. The app's entries live beside AI-DLC's and must survive an AI-DLC reinstall or upgrade, or be detected as missing (FR4.5).
- opencode exposes events through its plugin and event API, not the same hooks as Claude Code.
- The app's existing rule that harness folders are engine-owned in the editor (`fileWrite.js` `isEngineOwned`) stays for the editor. Installing hooks and the plugin is a separate, previewed exception (FR4.2).
- Only harnesses marked `selectable` in `src/shared/harnesses.js` (Claude Code, opencode) are covered.
- Electron main/preload/renderer split: the renderer never writes to a pty or a settings file directly for this feature; answers go through a main-side IPC that checks FR3.1.

## Assumptions

Confirmed by the person in `requirements-analysis-questions.md` (Assumption Confirmation).

- `[assumption]` Claude Code's hooks report the structured question (text, options with descriptions, header, multi-select, batch) for its question tool, and report permission prompts and the end of each turn with the last message. Reason: these are the hook events the US-0506 background names; Functional Design confirms the exact fields against the installed Claude Code version.
- `[assumption]` Where a hook cannot return the answer itself, pressing the picker's own keys computed from the hook's exact options is reliable. Reason: the remaining mismatch today comes from the audit log's options, which FR3.2 no longer uses.
- `[assumption]` A hook can wait for the app's answer long enough for a person to read and decide (minutes, not seconds), with a time limit after which it hands back to the terminal (NFR5).
- `[assumption]` The app can tell its own sessions apart by an environment value it sets when it starts the agent tab (FR1.3, NFR3).
- `[assumption]` One person per app; the app is a single-user local tool, so no multi-user rules apply beyond FR4.4 for teammates' own checkouts.

## Out of scope

- Codex, Kiro, Cursor and Copilot (not selectable as agent tabs).
- Showing the full conversation history in the app; the terminal keeps it.
- Answering anything automatically, including "always allow" rules the app would apply on its own.
- Changing AI-DLC's own question format or audit log.
- Removing the screen-reading fallback; it stays for projects without the hooks (FR4.5).

## Open questions

- Which hook events and fields does the installed Claude Code version offer, and can a hook return the answer to its question tool, or only to a permission prompt? To settle in Functional Design with a spike against a real session.
- Which opencode plugin events carry questions, permission prompts, idle and finished replies, and how is an answer returned? Same spike.
- How long may a Claude Code hook wait, and what is the right hand-back time (NFR5)?
- How are the app's entries in `.claude/settings.json` marked so AI-DLC's upgrade keeps them, or so the app notices they are gone?
- Which release takes this work (v0.2.5 or later); to settle in Delivery Planning.
