# Requirements: US-0901 See a project's AI-DLC configuration

## Sources

- Initial description: "continue" [desc]. The person's standing instruction (2026-11-13) is that EPIC-09's stories follow US-0802 in order, so this intent is US-0901.
- Story US-0901 and its acceptance criteria in `docs/features/epic-09-aidlc-configuration.md`, including the epic's research table of read-only sources [desc]
- Workflow-selected scope: ultra-express [scope]
- Output of `aidlc config --show --json` and `aidlc config list --json` on this project (2026-11-14)
- Code: `src/main/models.js`, `src/main/exec.js`, `src/main/harness.js`, `src/shared/harnesses.js`, `src/main/watcher.js`, `src/renderer/App.jsx`, `src/renderer/ProjectSettingsDialog.jsx`; codekb `architecture.md`
- Answers in `requirements-analysis-questions.md` [Q1] [Q2] [Q3]

## Intent analysis

A developer who runs AI-DLC in several projects wants to see, in one place, how AI-DLC is set up in the project in front of them before they start work: which model and effort each agent runs, which project defaults apply, what the active work runs with, which plans exist, the provider and the plugins, and where each value comes from. Today that means running several `aidlc config` commands by hand.

This story is read-only. Changing settings is US-0902 (defaults and the active work), US-0903 (plans) and US-0904 (models). The view built here is the place those stories add their controls.

## Functional requirements

### FR1 The configuration view

- **FR1.1** Each AI-DLC project has a "Konfiguration / Configuration" view, next to the intents and features views. It opens from the left arm and from a link in the project settings dialog (US-0405).
- **FR1.2** The view has six sections, in this order: models and effort, project defaults, the active work's settings, plans, provider, plugins.
- **FR1.3** Every label is translated through the shared i18n module (sv and en).

### FR2 Reading the values

- **FR2.1** Main runs `aidlc config --show --json --harness <h>` and `aidlc config list --json` through `runFixed` (fixed arguments, no shell, timeout), in the project root.
- **FR2.2** Models and effort: one row per agent from `sections.models.data.effective`, with model, effort and their sources (`modelSource`, `effortSource`). An agent without an effort shows "—".
- **FR2.3** Project defaults: every switch in `sections.flags.data.sources`, with its effective value and source [Q1]. A switch at the shipped default shows that as its source.
- **FR2.4** Active work: every key from `aidlc config list --json` with its value and the source AI-DLC gives in brackets (for example "scope ultra-express", "guard policy off"). With no active intent the section says so in one sentence.
- **FR2.5** Provider: provider, region and profile from `sections.providers`, and whether the harness manages them itself (`harnessManaged`).
- **FR2.6** Plugins: the installed plugins (`sections.project.data.installedPlugins`) and the selected ones.
- **FR2.7** A value whose source is the environment (`env`) is marked "set by an environment variable", so the person knows a file change will not take effect.
- **FR2.8** Main parses the JSON, keeps only the fields the view shows, and sends that to the renderer. The renderer gets no raw CLI output.

### FR3 Plans

- **FR3.1** The plans section lists every plan: the shipped ones from the harness's `scopes/` folder (for Claude Code `.claude/scopes/`) and the project's own from `aidlc/scopes/` [Q3].
- **FR3.2** Each plan shows its `name` and `description` from the frontmatter. A plan in `aidlc/scopes/` is marked as the project's own; its harness copy (same `name`) is not listed twice.
- **FR3.3** The active intent's plan is highlighted.
- **FR3.4** A plan file that cannot be read or has no `name` is skipped with a console warning; the rest still show.

### FR4 Harness

- **FR4.1** The view follows the harness chosen for the agent tab (US-0801) by default [Q2].
- **FR4.2** When the project has more than one harness installed, a picker lists only the installed harnesses. Choosing one reloads the view for that harness. It does not change the agent tab's harness.
- **FR4.3** Main passes `--harness <h>` only when `<h>` is in the fixed harness table and installed in the project; any other id is refused.
- **FR4.4** On Cursor and GitHub Copilot the models section is greyed out with one line: the session or IDE picker chooses the model.

### FR5 Errors and missing AI-DLC

- **FR5.1** When `aidlc` is not found, times out or fails, the view says so in one sentence with the error, and offers the setup dialog (US-0503 / US-0802).
- **FR5.2** After a failure the view shows no values from an earlier read as current.
- **FR5.3** When one of the two commands fails and the other works, the sections from the working command show and the others carry the error.

### FR6 Reload

- **FR6.1** The view reloads when `aidlc.settings.json`, `aidlc.settings.local.json`, `.claude/scopes/`, `aidlc/scopes/` or the active intent's `aidlc-state.md` changes, through the project's watcher (US-0302).
- **FR6.2** Reloads are debounced like the other watcher events, so a burst of changes runs the commands once.

## Non-functional requirements

- **NFR1** The app writes nothing for this story: the view only reads.
- **NFR2** The CLI runs only through `runFixed` with string arguments; the harness id is validated against the fixed table before it reaches an argument list.
- **NFR3** The read never throws to the renderer: errors come back as a value the view shows (FR5).
- **NFR4** The view is available within 10 s of opening it on a project where `aidlc` answers (the `runFixed` timeout); while it loads it shows a loading state, not empty sections.

## Constraints

- Read-only CLI commands only, as listed in the epic. No new dependency.
- The view lives in the existing per-project `ProjectView`, so it stays mounted like the others.

## Assumptions

- The JSON shapes are those `aidlc` printed on 2026-11-14 (`schemaVersion: 1`). A missing field shows "—", not an error. [assumption]
- On opencode the shipped plans are in `.aidlc/scopes/`; the code reads the folder from the harness table entry. [assumption]

## Out of scope

- Any change to a setting (US-0902, US-0903, US-0904).
- The `runtime` and `trust` sections of `aidlc config --show`.
- The harness's own provider and model config files.

## Open questions

None.
