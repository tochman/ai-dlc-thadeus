# Requirements: EPIC-14 Spec Kit (v0.3.0)

Sources: the request ("start with stories in epic 14 with an inception… release 0.3.0 with all stories in this epic"), `docs/features/epic-14-spec-kit.md` (US-1401–US-1410), the ideation record `261119-spec-kit-ideation` (decisions D1–D14, constraints C1–C10, scope document), the code knowledge base `codekb/aidlc-dash/`, and `requirements-analysis-questions.md` (Q1–Q4a).

## Intent analysis

Developers whose projects follow GitHub Spec Kit cannot use THADEUS today: `detectProject` accepts only projects with `aidlc/spaces/`. The goal is that a project follows **one** framework, AI-DLC or Spec Kit, and the app shows only that framework's views on the shared shell. The first version is judged by one thing (D2): setting up a new project on Spec Kit from the app and starting its first feature there. All ten stories ship together as v0.3.0, a minor release of its own (D10, D12).

## Functional requirements

**FR1 — One framework per project (US-1401)**
- FR1.1 One value, `framework: 'aidlc' | 'speckit'`, decides the view set. It replaces every use of `detection.isAidlc` (`ipc.js`, `menu.js`, `App.jsx`, `ProjectView.jsx`).
- FR1.2 The list of views for each framework is defined once. Today it is written twice, in App.jsx and in ProjectView.jsx.
- FR1.3 Given an AI-DLC project, it opens exactly as in v0.2.12. The existing suite stays green.
- FR1.4 Given a Spec Kit project, the left arm shows the Spec Kit views and no AI-DLC views. Where both frameworks have the same kind of thing (a list of work, its detail, its rules), it sits in the same place in the arm, with a component of its own.
- FR1.5 Given no saved framework: if only `.specify/` exists, the project is Spec Kit. If `aidlc/spaces/` exists, alone or together with `.specify/`, it is AI-DLC.
- FR1.6 The shared shell works the same for both frameworks: terminal, dialogs and hooks, editor, git, Features view and project settings.

**FR2 — Framework kept in the repository (US-1408, Q1)**
- FR2.1 The choice is kept in `.thadeus/project.json` as `{ "framework": "<value>" }`. It is written only after the person confirms, and the preview names the file.
- FR2.2 Given another clone with that file, the app follows the same framework and does not ask again.
- FR2.3 Given the file is missing, unreadable, or holds an unknown value, the app falls back to FR1.5 and says why.

**FR3 — Set up Spec Kit (US-1405)**
- FR3.1 The app runs `specify init --integration <claude|opencode>` for the project's harness, after a preview of what it will do.
- FR3.2 Given `specify` is not on the login shell's `PATH`, the app says so and names `uv tool install specify-cli`. It never installs it.
- FR3.3 Given `specify init` fails, the app shows its output, and the project stays as it was in the app.

**FR4 — First open: what is installed, and the choice (US-1406)**
- FR4.1 Given a project with no saved framework, the app shows what it found: AI-DLC, Spec Kit, both or neither. It also shows whether `aidlc` and `specify` are on the `PATH`.
- FR4.2 Exactly one framework found: it is proposed, and one click confirms it. Both found: the person chooses, and the other is left alone and not shown. Neither found: the person chooses, and the app goes on to that framework's setup (US-0503 or FR3).
- FR4.3 Nothing is written in the project before the person confirms.

**FR5 — Run Spec Kit commands (US-1403)**
- FR5.1 For a feature, the app offers the next command from where the feature stands (FR6.2). Examples: `/speckit-plan` when there is a spec but no plan, `/speckit-implement` when tasks are open, `/speckit-converge` after an implement round. A click runs it in the agent terminal.
- FR5.2 The quick commands are:
  - `/speckit-specify`, with a description the person types;
  - `/speckit-clarify`, `/speckit-analyze` and `/speckit-constitution`;
  - each command of an installed extension (FR7.2).
- FR5.3 Each command is written in the form the project's harness expects.
- FR5.4 Nothing runs without a click.

**FR6 — Features and where each stands (US-1402)**
- FR6.1 Each folder under `specs/` shows as a feature with its number (or timestamp) and its name. The one named in `.specify/feature.json` is marked active.
- FR6.2 The flow shows spec, clarify, plan, tasks, implement and converge as done or not done. It is worked out from the files that exist and from `tasks.md`, and the view says so.
- FR6.3 Tasks show grouped by phase, each with its ID, the `[P]` mark, the `[USn]` story and whether it is ticked, plus a count of done out of total. Convergence phases show as rounds.
- FR6.4 Each file of a feature opens in the artifact reader.
- FR6.5 The view updates when the files change.

**FR7 — Constitution and extensions (US-1404, Q3)**
- FR7.1 `.specify/memory/constitution.md` shows rendered and opens in the editor (EPIC-10).
- FR7.2 `.specify/extensions.yml` is read with the `yaml` package, a new dependency. Each extension and hook shows with:
  - its command;
  - which command it runs before or after;
  - whether it is optional, mandatory or turned off.
- FR7.3 A file that cannot be read is named, with the reason.

**FR8 — Switch framework (US-1407)**
- FR8.1 From the project settings, a preview shows what will happen:
  - the other framework's setup runs, if that framework is not there yet;
  - the views change;
  - the old framework's files stay untouched.
- FR8.2 The preview names work in progress (an unfinished intent, or a feature with open tasks) and says it is not carried over.
- FR8.3 After the switch, only the new framework's views show. Switching back works the same way. Nothing is deleted.

**FR9 — Token log per Spec Kit feature (US-1409, Q2)**
- FR9.1 Readings come from the coding tool's own session records (Claude Code's session transcripts, opencode's session store). They are credited to the feature that is active in `.specify/feature.json` when the usage happens.
- FR9.2 Given no active feature, readings go to a project-wide bucket that is named as such. They are never dropped.
- FR9.3 The log is kept under `.thadeus/tokens/`, never in `.specify/` or `specs/`.

**FR10 — Waiting questions and agent progress (US-1410)**
- FR10.1 In a Spec Kit project, the popup and the progress show what can be told from the agent dialog hooks and the feature's files, and say where it comes from.
- FR10.2 Given nothing can be told, they say so. `agents:progress` no longer throws when there is no AI-DLC workspace.

## Non-functional requirements

- **NFR1** Every user-facing text goes through `t()`, with the same keys in `sv.json` and `en.json` (`i18nKeys.test.js`).
- **NFR2** Every new view follows the LCARS look and the arm navigation.
- **NFR3** The app never writes in `.specify/` or `specs/` (C6). This is checked by a test that runs every Spec Kit reader and asserts that no write happens there.
- **NFR4** `specify`, `aidlc` and every other CLI run with fixed arguments, without a shell, from the login shell's `PATH`, and with a timeout (C7).
- **NFR5** Spec Kit v1.4.x and newer is supported (D11). A newer version is read with a warning that names the version, and each view names what it could not read.
- **NFR6** Harnesses: Claude Code and opencode only (C3). Opencode counts as installed in a Spec Kit project too, not only by AI-DLC's files.
- **NFR7** A change to a file under `specs/` or `.specify/` shows in the open view within 2 seconds, the same bound as the watcher has for AI-DLC files.
- **NFR8** Test first (TDD), 80% line coverage, and ESLint, Prettier and gitleaks green in CI before every story merges.

## Constraints

C1–C8 from the ideation constraint register apply: one framework per project, the choice kept in the repository, Claude Code and opencode only, read-only access to Spec Kit files, CLIs without a shell, and the team's quality gates. C4 ("any version") is replaced by NFR5 (D11), and C9 ("v0.2.11") by v0.3.0 (D10).

## Assumptions

- `specify init --integration opencode` works; this is checked on the test project (Q4).
- Spec Kit's licence allows use from the app; it is read before the release.
- The command form for each harness (`/speckit-plan` and so on), the layout of `feature.json`, and what `clarify`, `checklist` and `analyze` write are taken from the test project, which is made before Domain Design (Q4, Q4a). Until then they follow the epic.
- Corners settled by default:
  - A `specs/` folder with no recognisable number or name is listed under its folder name.
  - A malformed line in `tasks.md` is skipped and counted, and the rest is shown.
  - An empty `specs/` shows "no features yet" and offers `/speckit-specify`.
  - Two clones with different saved frameworks are a git conflict in `.thadeus/project.json`, and git shows it.
- The existing tests that use `isAidlc` are changed along with FR1.1. Their AI-DLC behaviour stays the same.

## Out of scope

- Moving work from one framework's format into the other's.
- Installing `specify` for the person.
- Both frameworks in one project.
- Harnesses other than Claude Code and opencode.
- Writing in `.specify/` or `specs/`.

## Open questions

- What the test project shows about `clarify`, `checklist` and `analyze` output and the command form per harness. It feeds Domain Design and FR5.3 and FR6.2.
