# EPIC-14: Spec Kit — follow and drive Spec Kit projects, as an alternative to AI-DLC

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Asked for 2026-11-19, after a look at [GitHub Spec Kit](https://github.com/github/spec-kit) (v1.4.2, 2026-11-17). Spec Kit is a spec-driven toolkit: the `specify` CLI (Python, `uv tool install specify-cli`) sets a project up, and slash commands in the agent's chat run its flow: `constitution` → `specify` → `clarify` → `plan` → `tasks` → `analyze` → `implement` ⇄ `converge`. Everything it produces is Markdown in fixed places: `.specify/memory/constitution.md`, one folder per feature under `specs/NNN-<name>/` (`spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `contracts/`, `checklists/`), the active feature in `.specify/feature.json`, and extension hooks in `.specify/extensions.yml`. It has no state file, no audit log, no usage ledger and no approval gates, so how far a feature has got is read from which files exist and which tasks in `tasks.md` are ticked.
>
> Decided 2026-11-19: a project follows **one** framework, AI-DLC or Spec Kit, never both. The shared shell (the LCARS frame, the agent terminal, dialogs and hooks, the editor, git and the platform connection, the Features view, project settings and the token log) stays the same. Each framework gets its own set of views. Where the two have the same kind of thing (a list of work, its detail, its rules), it sits in the same place in the left arm but has its own components, so no component has to know both frameworks. The app also runs the `/speckit-*` commands, as it does `/aidlc`.

**Stories:** US-1401–US-1405

**Status (2026-11-19):** 📋 US-1401–US-1405 planned.

---

## User Stories

**US-1401: One framework per project, and views that follow it** 📋 Planned
- As a **developer**, in order to **use THADEUS with the framework my project follows**, I would like **the app to see whether a project is an AI-DLC or a Spec Kit project, and show that framework's views**.
- **Epic:** EPIC-14
- **Priority:** High
- **Complexity:** Medium
- **Background:** Asked for 2026-11-19. Today a project is accepted only when it has `aidlc/spaces/` (`detectProject` in `src/main/projectService.js`).
- **Acceptance Criteria:**
  - [ ] **Given** a folder with `aidlc/spaces/` and no `.specify/`, **when** I open it, **then** it opens as an AI-DLC project, exactly as today.
  - [ ] **Given** a folder with `.specify/` and no `aidlc/spaces/`, **when** I open it, **then** it opens as a Spec Kit project, with the Spec Kit views in the left arm and no AI-DLC views.
  - [ ] **Given** a folder with both, **when** I open it, **then** the app says it found both, asks once which one to follow, and keeps the answer in the project settings. It can be changed there later.
  - [ ] The shared shell (terminal, dialogs and hooks, editor, git, Features view, project settings, token log) works the same for both.
  - [ ] Nothing is written in `aidlc/` or `.specify/`. Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Notes:** One value, `framework: 'aidlc' | 'speckit'`, decides the view set. No general plugin system.
- **Dependencies:** none

**US-1402: Spec Kit features: the list and where each one stands** 📋 Planned
- As a **developer**, in order to **see my Spec Kit work at a glance**, I would like **a list of the project's features and, for each one, its progress through the Spec Kit flow and its tasks**.
- **Epic:** EPIC-14
- **Priority:** High
- **Complexity:** Medium
- **Background:** Asked for 2026-11-19. Fills the place that Intents and the pipeline have in an AI-DLC project.
- **Acceptance Criteria:**
  - [ ] **Given** folders under `specs/`, **then** each shows as a feature with its number (or timestamp) and name, and the one named in `.specify/feature.json` is marked active.
  - [ ] **Given** a feature, **then** its flow shows spec, clarify, plan, tasks, implement and converge as done or not, worked out from the files that exist and from `tasks.md`. The view says it is worked out from files.
  - [ ] **Given** a `tasks.md`, **then** its tasks show by phase, with ID, the `[P]` parallel mark, the `[USn]` story and ticked or not, and a count of done and total. Convergence phases show as rounds.
  - [ ] Every file of the feature (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `checklists/`) opens in the artifact reader.
  - [ ] The view updates live when the files change. Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Notes:** Before this story starts, a test project made with `specify init` checks how `clarify`, `checklist` and `analyze` record their output.
- **Dependencies:** US-1401

**US-1403: Run Spec Kit commands from the app** 📋 Planned
- As a **developer**, in order to **drive Spec Kit without typing every command**, I would like **the app to offer the next `/speckit-*` command for a feature and run it in the agent terminal**.
- **Epic:** EPIC-14
- **Priority:** High
- **Complexity:** Medium
- **Background:** Decided 2026-11-19: the app runs the `/speckit-*` commands, as it does `/aidlc` (Resume and the quick commands, EPIC-05).
- **Acceptance Criteria:**
  - [ ] **Given** a feature, **then** the app offers the next command from where it stands (for example `/speckit-plan` when it has a spec but no plan, `/speckit-implement` when tasks are open, `/speckit-converge` after an implement round), and runs it in the agent terminal when I click.
  - [ ] Quick commands for the Spec Kit project include `/speckit-specify` with a description I type, `/speckit-clarify`, `/speckit-analyze` and `/speckit-constitution`, and the commands of installed extensions (from `.specify/extensions.yml`).
  - [ ] Each command is written in the form the project's harness expects (Spec Kit's invocation style for that integration).
  - [ ] Nothing runs without my click. Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Dependencies:** US-1401, US-1402

**US-1404: Constitution and extensions** 📋 Planned
- As a **developer**, in order to **see and change the rules my agents follow in a Spec Kit project**, I would like **a view of the project's constitution and its installed extensions and hooks**.
- **Epic:** EPIC-14
- **Priority:** Medium
- **Complexity:** Small
- **Background:** Asked for 2026-11-19. Fills the place that the memory layers and configuration have in an AI-DLC project.
- **Acceptance Criteria:**
  - [ ] **Given** `.specify/memory/constitution.md`, **then** it shows rendered and opens in the editor (EPIC-10).
  - [ ] **Given** `.specify/extensions.yml`, **then** each extension and hook shows with its command, before or after which command it runs, and whether it is optional, mandatory or turned off.
  - [ ] A file that cannot be read is named, with the reason, never hidden. Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Dependencies:** US-1401

**US-1405: Set up Spec Kit in a project** 📋 Planned
- As a **developer**, in order to **start a new project on Spec Kit from the app**, I would like **the app to run `specify init` for the project's harness, after a preview**.
- **Epic:** EPIC-14
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-19. Mirrors the AI-DLC setup (US-0503).
- **Acceptance Criteria:**
  - [ ] **Given** a folder with neither framework, **when** I choose to set one up, **then** I can choose AI-DLC or Spec Kit. For Spec Kit, the app runs `specify init --integration <claude|opencode>` for the project's harness, after a preview of what it will do.
  - [ ] **Given** a project that already follows one framework, **then** setup does not offer the other.
  - [ ] **Given** no `specify` command on the login shell's `PATH`, **then** the app says so and names how to install it (`uv tool install specify-cli`). It does not install it.
  - [ ] Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Dependencies:** US-1401, US-0503
