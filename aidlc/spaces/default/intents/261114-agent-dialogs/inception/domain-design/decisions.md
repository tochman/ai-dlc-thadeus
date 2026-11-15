# Architecture Decisions: agent dialogs (EPIC-05 US-0506)

## Sources

- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md`.
- User stories: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md`.
- Code knowledge base: `aidlc/spaces/default/codekb/aidlc-dash/architecture.md`, `aidlc/spaces/default/codekb/aidlc-dash/component-inventory.md`.
- Team practices: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/practices-discovery/team-practices.md`.
- Answers: `domain-design-questions.md` `[Q1]`…`[Q5]`.

| ADR | Title | Status |
|---|---|---|
| ADR-001 | File-based channel between hook and app | Accepted |
| ADR-002 | Events and the answer check live in main | Accepted |
| ADR-003 | One adapter per harness, the rest harness-neutral | Accepted |
| ADR-004 | Script in `.thadeus/hooks/`, entries recognised by their command | Accepted |
| ADR-005 | Hook or fallback source per project and harness | Accepted |
| ADR-006 | One new dialog replaces QuestionPopup | Accepted |

## ADR-001: File-based channel between hook and app

### Status
Accepted (2026-11-14, `[Q1]`)

### Context
The committed hook script may use only what macOS and Linux provide by default, with no Node.js and no app binary (FR4.6). It must wait minutes for a person, notice within 2 s that the app is gone (FR6.3, NFR5), keep every character (FR6.2), and accept events only from the app's own sessions (NFR3). Claude Code gives the hook JSON on stdin, which plain `sh` cannot parse reliably.

### Decision
We will use files. Per agent tab, main creates a folder under the app's userData with mode 0700, a random secret and a session id, and passes them in the tab's environment. The script copies the hook's stdin unchanged into an event file (written then renamed), polls every 100 ms for an answer file, and watches a liveness file the app refreshes every 500 ms. Main parses the JSON.

### Consequences
- Positive: plain `sh`; no port, no network listener; the JSON never passes through shell parsing, so every character survives; nothing to install for teammates.
- Positive (security): the folder is readable only by the user; a file without the folder's secret is refused; the secret never reaches a committed file.
- Negative: polling adds up to 100 ms per answer, inside NFR1's 1 s; stray files must be cleaned at shutdown and next start.
- Neutral: the opencode plugin could use any channel, but uses the same files so main has one intake.

### Alternatives Rejected
- **Local HTTP with curl:** opens a localhost port any local process can probe, and `curl` is not on every minimal Linux.
- **Unix domain socket with nc or curl:** `nc -U` differs between BSD and GNU netcat, and neither is guaranteed present.

## ADR-002: Events and the answer check live in main

### Context
Today the question list and the answer path live in the renderer (`App.jsx`, `TerminalContext.answer()`), and `pty:write` accepts any string for any session (architecture.md). FR3.1 requires that an answer reaches only the session that asked, and the constraints say the renderer never writes to a pty for this feature.

### Decision
We will keep every open event, its lifecycle and the answer check in a new main-side AgentEventStore. The renderer sends only an event id and the person's picks or text; the store checks the event is open and its session live, builds the harness answer, and delivers it through the channel or PtyManager.

### Consequences
- Positive (security): a compromised or buggy renderer cannot answer another session or send raw keys; permission prompts are never answered without a person's action (FR3.4).
- Positive: events survive renderer reloads; tests of the rules run in node.
- Negative: more IPC surface (new bridge members) and a move of logic out of `App.jsx`.

### Alternatives Rejected
- **Keep the list in the renderer and add a check in `pty:write`:** the check would need the event model in main anyway, and keys would still be built in the renderer.

## ADR-003: One adapter per harness, the rest harness-neutral

### Context
Claude Code's hook input and opencode's plugin events have different shapes, and both may change with their versions (Open questions in requirements.md). The answer goes back either as a hook output or as picker keys computed from the reported options (FR3.2, FR3.6).

### Decision
We will put all harness-specific parsing and answer building in a pure HarnessEventAdapter with one implementation per selectable harness. The store, channel and UI see only the app's event shape.

### Consequences
- Positive: a harness update touches one module and its recorded-payload fixtures (`[Q4]` of User Stories); adding a harness later starts beside `src/shared/harnesses.js`.
- Positive (security): unreadable payloads become rejected events with a reason, never guessed options.
- Negative: an extra translation layer to keep in step with two event formats.

### Alternatives Rejected
- **Normalise in the scripts:** `sh` cannot parse JSON safely, and it would duplicate logic in two runtimes.
- **Handle both formats inside the store:** mixes harness detail into the lifecycle rules.

## ADR-004: Script in `.thadeus/hooks/`, entries recognised by their command

### Context
The app writes entries into the shared `.claude/settings.json`, which AI-DLC also rewrites on install or upgrade (Constraints). The app must find, update and remove only its own entries (FR4.3) and detect when they are gone (FR4.5).

### Decision
We will commit the script in a folder of the app's own, `.thadeus/hooks/`, at the project root. An entry in `.claude/settings.json` is the app's exactly when its command runs a script in that folder. No extra keys go into the settings file.

### Consequences
- Positive: no unknown keys that Claude Code or AI-DLC might reject or strip; AI-DLC's upgrades of `.claude/` never touch the script; detection is a plain string match.
- Positive (security): the hook entry's command checks the session variables before the script is looked for, so a checkout without the folder runs nothing (FR4.6).
- Negative: a person who hand-edits the command so it no longer names the folder makes the entry invisible to the app; it is then reported as missing and offered again.
- Neutral: the exact script file names and the opencode plugin path are fixed in Functional Design.

### Alternatives Rejected
- **The same folder plus a manifest:** a second source of truth that can disagree with the settings file.
- **`.claude/hooks/thadeus/`:** inside a harness folder that AI-DLC and the editor treat as engine-owned.

## ADR-005: Hook or fallback source per project and harness

### Context
Projects without the hooks keep today's audit-log questions and screen-read answers (FR4.5). A project can run Claude Code and opencode side by side, and the two parts are installed separately.

### Decision
We will choose the source per project and harness (`[Q3]`, `[Q5]`): Claude Code tabs of a project use hook events when that project's Claude Code hooks are current; opencode tabs use plugin events when its plugin is current; a harness whose part is missing or out of date keeps the audit-log questions. Both sources feed the same store and dialog.

### Consequences
- Positive: no duplicate questions (the same AI-DLC gate never shows twice); the fallback stays exactly today's code.
- Negative: a session started before the hooks were installed sends no events until its tab restarts; the store must then keep showing fallback questions for it. Functional Design decides how that tab is told apart.
- Neutral (security): the fallback keeps today's screen-read answer with its known limits; nothing new is exposed.

### Alternatives Rejected
- **Per agent tab by first hook event:** decides only after an event arrives, so the first question of a session could show twice.
- **Strictly per project (both parts current):** one missing part would turn off the new dialog for the harness that has it.
- **Both sources, merged by text:** fragile matching, the source of today's mismatch.

## ADR-006: One new dialog replaces QuestionPopup

### Context
The mockups (M1–M4) need batches, multi-select, descriptions, permission and reply kinds, and the fallback must stay usable (FR4.5).

### Decision
We will build a new AgentDialog that replaces `QuestionPopup.jsx`. Fallback questions are mapped to the same event shape and shown by the same dialog, answered through the existing screen-read path.

### Consequences
- Positive: one dialog to test and to learn; the person never sees two styles.
- Negative: the existing popup tests move to the new component; the fallback's answer path must be kept working through the new dialog.
- Neutral (security): text rendering goes through the existing sanitising `FileContent` (no HTML, links http/https on click only, NFR3).

### Alternatives Rejected
- **Extend QuestionPopup in place:** it is built around one plain-text question and gate buttons; most of it would be rewritten anyway.
- **Keep both dialogs:** two dialogs can show at once and confuse the pager order (FR6.1).
