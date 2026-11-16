# Requirements: US-0504, update the AI-DLC framework from the console

## Intent analysis

The person wants to keep AI-DLC current without remembering CLI commands. There are two updates: the `aidlc` program on this machine (`aidlc update`), and the AI-DLC files in a project (`aidlc config --harness <id>`, which writes `.claude/`, `.aidlc/` …). The app should show what is out of date and type the right command into the shell tab for the person to confirm. It never writes the framework itself. Enhancement in main (CLI calls) and Settings › Tools (UI). Depth: Minimal.

## Functional requirements

- **FR1 Program row [Q1, Q2].** Settings › Tools shows an "AI-DLC program" row beside the existing `aidlc` tool card.
  - **FR1.1** It shows the installed version from `aidlc --version`.
  - **FR1.2** It says whether a newer release exists, from `aidlc update --check --json` (exit 5 means newer, 0 means current). It names the newer version when the answer gives one.
  - **FR1.3** "Update AI-DLC" types `aidlc update` into the shell tab without pressing Enter.
- **FR2 Project row [Q1, Q2].** For the active project, an "AI-DLC in this project" row lists each installed harness.
  - **FR2.1** For each harness, `aidlc --project-dir <root> config --harness <id> --dry-run --json` gives the files it would create, update, merge or remove. The row shows the counts, and the file list unfolds (files only "preserved" are left out). A conflict is shown as a warning.
  - **FR2.2** When a harness has nothing to change, it says so ("Up to date").
  - **FR2.3** "Update the project files" types `aidlc config --harness <id> --yes` for that harness into the shell tab without pressing Enter. The app never writes framework files itself.
- **FR3 When it checks [Q3].** The program check runs once when the app starts and when the person presses "Check for updates". The project dry run runs when Settings › Tools opens and on the same button.
- **FR4 Disabled while working.** Both update buttons are disabled while an AI-DLC workflow is running, with the same rule as the refresh panel (US-0502): a busy agent tab, or an AI-DLC write in the last 5 minutes. The rule is shared, not copied.
- **FR5 Failures.** A failed or offline check says why in one sentence (for example "update check unavailable while offline") and never blocks Settings.
- **FR6 Translations.** Every new text goes through `t()` in Swedish and English.

## Non-functional requirements

- **NFR1 Fixed arguments, no shell:** every call goes through `runFixed` with `toolPath('aidlc')`. A project path or harness id is validated before it becomes an argument.
- **NFR2 Bounded:** each call times out (30 s for checks), and the start-up check runs after the window has loaded.
- **NFR3 No new dependency.**

## Constraints

- The typed command uses the existing `terminal.type('shell', cmd, { submit: false })` path from US-0502.
- `aidlc update --check` changes only the CLI's own release metadata on this machine, never project files.

## Assumptions

- [assumption] Settings is app-wide, so the project row describes the project that is open and active; with no project open, it is hidden. Reason: Q2 chose Settings › Tools.
- [assumption] With several harnesses installed (Claude Code, opencode), each gets its own line and its own update command, since `config` needs `--harness`.
- [assumption] Exit code 5 from `update --check` is read as "newer"; `runFixed` rejects non-zero exits, so the code reads the exit code and the JSON from the error.

## Out of scope

- Installing or updating without the person pressing Enter in the shell.
- Choosing a release channel or pinning a version (`--channel`, `--pin`).

## Open questions

None.

## Sources

- Initial description: US-0504 in `docs/features/epic-05-workflow-control.md` [desc]
- Workflow-selected scope: express [scope]
- Answers: `requirements-analysis-questions.md` [Q1] [Q2] [Q3]
- Code scan: `inception/reverse-engineering/developer-scan.md`; a dry run of `aidlc config --harness claude --dry-run --json` on this repository (per-file `actions`).
