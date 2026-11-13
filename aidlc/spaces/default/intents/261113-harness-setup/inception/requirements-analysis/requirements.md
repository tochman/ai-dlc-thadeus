# Requirements: US-0802 Set up AI-DLC for another harness

## Sources

- Initial description: "US-0802: Set up AI-DLC for another harness (EPIC-08, docs/features/epic-08-harnesses.md)" [desc]
- Story US-0802 and its acceptance criteria in `docs/features/epic-08-harnesses.md` [desc]
- Workflow-selected scope: ultra-express [scope]
- Code: `src/main/setup.js`, `src/renderer/SetupAidlc.jsx`, `src/shared/harnesses.js`, `src/main/harness.js` (US-0801), `src/renderer/ProjectSettingsDialog.jsx`
- Answers in `requirements-analysis-questions.md` [Q1] [Q2]

## Intent analysis

Setting up AI-DLC from the app only installs Claude Code today: `--harness claude` is built into `setup.js`. A developer who uses opencode, or wants a second harness in a project that already has AI-DLC, should be able to pick the harness in the app and have the app install it, without typing CLI commands. This builds on the harness table and detection from US-0801.

This story changes the story's original rule that setup is typed into the shell tab. The app now runs the CLI itself [Q2], in line with the EPIC-09 decision that the app may run the `aidlc` CLI itself.

## Functional requirements

### FR1: Choosing the harness in setup

- **FR1.1** The setup dialog (US-0503) has "Harness" with all six harnesses AI-DLC installs: Claude Code, opencode, Codex, Kiro, Cursor and Copilot [Q1]. [desc]
- **FR1.2** The default is the harness whose CLI is found (from US-0801's detection), preferring Claude Code when several are found or none is. [desc]
- **FR1.3** Each option shows whether its CLI was found. Harnesses that the agent tab can't run yet (Codex, Kiro, Cursor, Copilot) are marked "installs AI-DLC files; can't run in the agent tab yet". [Q1]
- **FR1.4** The harness id sent to main is checked against the fixed table. Any other value is refused (input validation).

### FR2: Preview and apply

- **FR2.1** The preview runs `aidlc --project-dir . config --harness <harness> --dry-run` (fixed arguments, no shell), and the dialog shows its counts, conflicts and notes as today. [desc]
- **FR2.2** **Apply** runs the same command with `--yes` from the app (fixed arguments, no shell) [Q2]. The dialog shows that it is running, then the result. On success: the outcome. On failure: the CLI's error message, in one plain sentence plus the details.
- **FR2.3** The rest of the setup choices from US-0503 (plugins, model preset, git and other prerequisite steps) keep working and are applied by the app in the same run, in the same order as today's command chain.
- **FR2.4** Nothing is applied without the preview having run first and the person pressing Apply.

### FR3: Adding a harness to an existing AI-DLC project

- **FR3.1** In Projektinställningar, "Lägg till harness… / Add harness…" opens the same preview-and-apply flow for a harness the project doesn't have yet. Harnesses already installed are listed as installed and can't be added again. [desc]
- **FR3.2** Existing harnesses and the `aidlc/` records stay untouched. The preview shows that nothing existing is removed, and Apply is blocked if the preview reports anything to be removed or a conflict. [desc]

### FR4: After setup

- **FR4.1** After a successful setup, detection (US-0801) runs again for the project, so the new harness shows as installed at once. [desc]
- **FR4.2** If the new harness can run in the agent tab (Claude Code or opencode) and isn't the current one, the app offers to switch the agent tab to it ("Switch the agent tab to opencode?"). Switching follows US-0801: it asks first if the tab is busy. [desc]

### FR5: Texts

- **FR5.1** All new texts are in both `sv.json` and `en.json` with the same placeholders (the US-0701 key checks).

## Non-functional requirements

- **NFR1** No new dependencies.
- **NFR2** The existing suite stays green. Tests that assert the typed setup command or `--harness claude` are updated.
- **NFR3** The setup run has a timeout and can't hang the dialog; a timeout is shown as an error. Only one setup can run at a time per project.

## Constraints

- External commands go through `runFixed` (`src/main/exec.js`): fixed arguments, the login PATH, no shell.
- The app writes nothing into the project itself. The `aidlc` CLI does the writing.

## Assumptions

- [assumption] `aidlc config --harness <h>` takes the harness ids `claude`, `opencode`, `codex`, `kiro`, `cursor` and `copilot`, and adding a harness to a project that already has AI-DLC merges without touching the existing harness (AI-DLC's own config merges). The build checks this with `--dry-run`.
- [assumption] The CLI checks for installed harness CLIs are the ones US-0801 detects. Cursor and Copilot have no CLI probe; for them "CLI found" is not shown.

## Out of scope

- Running Codex, Kiro, Cursor or Copilot in the agent tab.
- Removing a harness from a project.

## Assumptions & Open Questions

- Both assumptions stay open until Code Generation checks them with `--dry-run`.
