# Requirements: US-0801 Choose the harness per project

## Sources

- Initial description: "US-0801: Choose the harness per project (EPIC-08, docs/features/epic-08-harnesses.md)" [desc]
- Story US-0801 and its acceptance criteria in `docs/features/epic-08-harnesses.md` [desc]
- Workflow-selected scope: express [scope]
- Code scan: `inception/reverse-engineering/developer-scan.md` and `aidlc/spaces/default/codekb/aidlc-dash/`
- Answers in `requirements-analysis-questions.md` [Q1]–[Q3]

## Intent analysis

The console's agent terminal only runs Claude Code. A developer who drives AI-DLC with opencode should be able to choose that per project, and get the same agent tab, states and one-click commands. The dashboard views keep working because they read the shared `aidlc/` records. This story makes Claude Code and opencode selectable. Other harnesses are detected and named but not selectable yet [Q1].

- **Type:** enhancement, cross-cutting in the terminal code (main and renderer).
- **Complexity:** standard.

## Functional requirements

### FR1: Detection

- **FR1.1** When a project opens, the app detects which harnesses are installed in it from their folders: `.claude/` (Claude Code), `.aidlc/` or `opencode.json` with AI-DLC entries (opencode), `.codex/` (Codex), `.kiro/` (Kiro), `.cursor/` (Cursor), and `.github/` holding AI-DLC files (Copilot). [desc]
- **FR1.2** The app detects which harness CLIs are on the login PATH (`claude`, `opencode`, `codex`, `kiro-cli`) and reads each version with `<cli> --version`: fixed arguments, no shell, a timeout, run in parallel, cached per open project. [desc]
- **FR1.3** Detection never fails the project open. A probe that fails or times out counts as "not found".

### FR2: Choice per project

- **FR2.1** Projektinställningar has "Agent-terminal" with the selectable harnesses Claude Code and opencode [Q1]. Detected harnesses that are not supported yet are listed as "not supported yet" and can't be chosen. [desc] [Q1]
- **FR2.2** Default: the only installed selectable harness, or Claude Code when there are several or none. [desc]
- **FR2.3** The choice is saved as `harness` (`claude` or `opencode`) in the project's entry in the app's own `settings.json`, never in the project. An invalid value falls back to the default. [desc]
- **FR2.4** Pass/fail: choosing opencode for project A leaves project B on Claude Code, and the choice survives an app restart.

### FR3: The agent tab

- **FR3.1** The agent tab's internal id is the neutral `agent` everywhere: tab id, state key, menu action, CSS and test ids. [Q2]
- **FR3.2** The tab is labelled with the chosen harness's name ("Claude", "opencode"). It starts that harness's CLI in the project root through the login shell. [desc]
- **FR3.3** The command to start comes from a fixed table in the main process, looked up by a validated harness id. The renderer never sends a command string.
- **FR3.4** The tab has the same states as today: Ledig, Arbetar and Avslutad (US-0501). [desc]

### FR4: Commands follow the harness

- **FR4.1** Fortsätt (Resume), the quick commands and the post-setup restart use the chosen harness's way of running AI-DLC, taken from one table per harness. For Claude Code and opencode both, that is `/aidlc …`. [desc]
- **FR4.2** No command is sent to a harness whose table lacks it. The button is then hidden or disabled with a reason. [desc]
- **FR4.3** opencode's readiness is checked against the installed opencode during the build. If the shared "1.5 s without output" rule does not detect it as ready, opencode gets its own readiness rule, so that Resume and the quick commands work without timing out. [Q3]

### FR5: Warnings

- **FR5.1** If the chosen harness is not installed in the project, or its CLI is not found, the tab says so in one sentence and offers to choose another harness. Setup of a new harness is US-0802. Nothing is started. [desc]

### FR6: Switching

- **FR6.1** Switching the harness while the agent tab is Arbetar asks for confirmation before the old session is closed. When the tab is Ledig or Avslutad, the switch is instant. [desc]

### FR7: Dashboard unchanged, harness-specific parts labelled

- **FR7.1** Intents, pipeline, timeline and features keep reading the shared `aidlc/` records, whichever harness wrote them. [desc]
- **FR7.2** Views whose data is Claude-specific say so ("covers Claude Code"): the cost panel (the ledger is filled by the Claude hooks) and the model table (`--harness claude`). [desc]

### FR8: Texts

- **FR8.1** Visible texts that name Claude but are really about the agent tab use the harness name through a `{harness}` placeholder, in both `sv.json` and `en.json`. Texts about Claude itself keep it. New texts come from the locales only (US-0701 key checks).

## Non-functional requirements

- **NFR1** No new runtime dependencies.
- **NFR2** The existing suite stays green. Tests that assert `claude` tab ids are updated to `agent`.
- **NFR3** Detection adds no visible delay to opening a project. Probes run in parallel and in the background, and the view shows "checking" until they finish.
- **NFR4** Only harness ids from the fixed table reach the pty. Any other value is refused in the main process (IPC input validation).

## Constraints

- Electron main/preload/renderer split. The pty runs `$SHELL -l -i -c <cli>` (`src/main/pty.js`). Fixed external commands use `runFixed` (`src/main/exec.js`).
- The app still writes no files into the project (US-0801 needs none).

## Assumptions

- [assumption] opencode installed for AI-DLC is recognised by `.aidlc/` or by AI-DLC entries in `opencode.json`, per AI-DLC's harness docs.
- [assumption] opencode runs AI-DLC with `/aidlc …`, like Claude Code (AI-DLC's onboarding says so). The build checks this with the installed opencode.
- [assumption] US-0802 (setup for another harness) is a separate story. Setup stays `--harness claude` here, and the warning in FR5.1 offers only "choose another".

## Out of scope

- Codex, Kiro, Cursor and Copilot as selectable harnesses (detected only).
- Setting up a harness from the app (US-0802).
- A cost ledger for opencode.

## Assumptions & Open Questions

- The three assumptions above stay open until Code Generation checks them against the installed opencode.
