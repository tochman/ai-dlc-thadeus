# EPIC-14: Spec Kit — follow and drive Spec Kit projects, as an alternative to AI-DLC

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Asked for 2026-11-19, after a look at [GitHub Spec Kit](https://github.com/github/spec-kit) (v1.4.2, 2026-11-17). Spec Kit is a spec-driven toolkit: the `specify` CLI (Python, `uv tool install specify-cli`) sets a project up, and slash commands in the agent's chat run its flow: `constitution` → `specify` → `clarify` → `plan` → `tasks` → `analyze` → `implement` ⇄ `converge`. Everything it produces is Markdown in fixed places: `.specify/memory/constitution.md`, one folder per feature under `specs/NNN-<name>/` (`spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `contracts/`, `checklists/`), the active feature in `.specify/feature.json`, and extension hooks in `.specify/extensions.yml`. It has no state file, no audit log, no usage ledger and no approval gates, so how far a feature has got is read from which files exist and which tasks in `tasks.md` are ticked.
>
> Decided 2026-11-19: a project follows **one** framework, AI-DLC or Spec Kit, never both. The shared shell (the LCARS frame, the agent terminal, dialogs and hooks, the editor, git and the platform connection, the Features view, project settings and the token log) stays the same. Each framework gets its own set of views. Where the two have the same kind of thing (a list of work, its detail, its rules), it sits in the same place in the left arm but has its own components, so no component has to know both frameworks. The app also runs the `/speckit-*` commands, as it does `/aidlc`. The person chooses the framework when a project is opened, and can switch a project from one to the other later.

**Stories:** US-1401–US-1407

**Status (2026-11-19):** 📋 US-1401–US-1407 planned, for v0.2.11.

---

## User Stories

**US-1401: One framework per project, and views that follow it** 📋 Planned, for v0.2.11
- As a **developer**, in order to **use THADEUS with the framework my project follows**, I would like **the app to show the views of the project's framework, AI-DLC or Spec Kit, and only those**.
- **Epic:** EPIC-14
- **Priority:** High
- **Complexity:** Medium
- **Background:** Asked for 2026-11-19. Today a project is accepted only when it has `aidlc/spaces/` (`detectProject` in `src/main/projectService.js`). Which framework a project follows is decided in US-1406 and can be changed in US-1407.
- **Acceptance Criteria:**
  - [ ] **Given** a project that follows AI-DLC, **then** it opens exactly as today.
  - [ ] **Given** a project that follows Spec Kit, **then** the left arm shows the Spec Kit views and no AI-DLC views.
  - [ ] The project's framework is kept in its project settings, and the view set follows it.
  - [ ] The shared shell (terminal, dialogs and hooks, editor, git, Features view, project settings, token log) works the same for both.
  - [ ] Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Notes:** One value, `framework: 'aidlc' | 'speckit'`, decides the view set. No general plugin system.
- **Dependencies:** none

**US-1402: Spec Kit features: the list and where each one stands** 📋 Planned, for v0.2.11
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
  - [ ] The view updates live when the files change. Nothing is written in `.specify/` or `specs/`. Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Notes:** Before this story starts, a test project made with `specify init` checks how `clarify`, `checklist` and `analyze` record their output.
- **Dependencies:** US-1401

**US-1403: Run Spec Kit commands from the app** 📋 Planned, for v0.2.11
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

**US-1404: Constitution and extensions** 📋 Planned, for v0.2.11
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

**US-1405: Set up Spec Kit in a project** 📋 Planned, for v0.2.11
- As a **developer**, in order to **start a project on Spec Kit from the app**, I would like **the app to run `specify init` for the project's harness, after a preview**.
- **Epic:** EPIC-14
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-19. Mirrors the AI-DLC setup (US-0503). It is reached from the choice in US-1406 and from a switch in US-1407.
- **Acceptance Criteria:**
  - [ ] **Given** Spec Kit is chosen for a project, **then** the app runs `specify init --integration <claude|opencode>` for the project's harness, after a preview of what it will do.
  - [ ] **Given** no `specify` command on the login shell's `PATH`, **then** the app says so and names how to install it (`uv tool install specify-cli`). It does not install it.
  - [ ] A failed `specify init` shows its output, and the project stays as it was in the app.
  - [ ] Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Dependencies:** US-0503

**US-1406: See what is installed in a new project, and choose its framework** 📋 Planned, for v0.2.11
- As a **developer**, in order to **start right with a project I open for the first time**, I would like **the app to show which framework the project already has, and let me choose the one it follows**.
- **Epic:** EPIC-14
- **Priority:** High
- **Complexity:** Medium
- **Background:** Asked for 2026-11-19. The first step when a project without a framework setting is opened.
- **Acceptance Criteria:**
  - [ ] **Given** a project opened for the first time, **then** the app shows what it found: AI-DLC (`aidlc/spaces/`), Spec Kit (`.specify/`), both or neither, and whether the `aidlc` and `specify` commands are on the login shell's `PATH`.
  - [ ] **Given** exactly one framework, **then** it is proposed, and one click confirms it.
  - [ ] **Given** both, **then** I choose which one the app follows. The other is left alone and not shown.
  - [ ] **Given** neither, **then** I choose AI-DLC or Spec Kit, and the app goes on to that framework's setup (US-0503 or US-1405).
  - [ ] The choice is kept in the project settings, and the project is not asked again. Nothing in the project is written before I confirm. Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Dependencies:** US-1401, US-1405

**US-1407: Switch a project from one framework to the other** 📋 Planned, for v0.2.11
- As a **developer**, in order to **move a project from AI-DLC to Spec Kit, or back**, I would like **to switch its framework from the project settings**.
- **Epic:** EPIC-14
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-19. A project still follows one framework at a time (decided 2026-11-19); switching changes which one.
- **Acceptance Criteria:**
  - [ ] **Given** a project that follows one framework, **when** I choose to switch in the project settings, **then** a preview shows what happens: the other framework's setup runs if it is not there yet (US-0503 or US-1405), the app's views change, and the old framework's files stay in the repository untouched.
  - [ ] **Given** work in progress in the old framework (an unfinished intent, or a feature with open tasks), **then** the preview names it and says it is not carried over.
  - [ ] After the switch, the app follows only the new framework, and the old one's views are gone. Switching back works the same way.
  - [ ] Nothing is deleted. Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Notes:** Moving work from one framework's format into the other's is out of scope.
- **Dependencies:** US-1401, US-1405, US-1406
