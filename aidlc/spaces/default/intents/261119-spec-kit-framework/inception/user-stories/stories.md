# User Stories: EPIC-14 Spec Kit (v0.3.0)

One story per epic story (Q1). Each carries its epic number, is grouped in the scope document's value-first order, and is tied to requirements.md. NFR1 (`t()` in Swedish and English), NFR2 (LCARS) and NFR8 (TDD, 80% coverage, lint) apply to every story and are not repeated below. Persona: P1 unless another is named.

## Group 1: A Spec Kit project opens, and every clone agrees

### US1.1 (US-1401): One framework per project, and views that follow it. Must
As a developer, I want the app to show only the views of my project's framework, so that I can use THADEUS with a Spec Kit project. FR1, NFR6.
- AC1.1.1: Given a project that follows AI-DLC, when I open it, then it opens as in v0.2.12, and the existing suite stays green (FR1.3).
- AC1.1.2: Given a project that follows Spec Kit, when I open it, then the left arm shows the Spec Kit views and no AI-DLC views (FR1.4).
- AC1.1.3: Given no saved framework and only `.specify/`, then the project is Spec Kit. Given only `aidlc/spaces/`, then it is AI-DLC (FR1.5).
- AC1.1.4: Given both frameworks and no readable `.thadeus/project.json`, then the app always asks, as in US2.2, and never guesses (R-02, Q2).
- AC1.1.5: The view set comes from one value, `framework`, and one shared list of views. No component checks `isAidlc` (FR1.1, FR1.2).
- AC1.1.6: Given a Spec Kit project on opencode, then opencode counts as installed (NFR6).

### US1.2 (US-1408): Keep the project's framework in the repository. Must
As P2, I want the framework kept in the repository, so that every clone follows the same one. FR2.
- AC1.2.1: Given the framework was confirmed on one clone, when another clone opens the project, then it follows the same framework and does not ask (FR2.2).
- AC1.2.2: The choice is written to `.thadeus/project.json` only after I confirm, and the preview names that file (FR2.1).
- AC1.2.3: Given the file is missing, unreadable, or holds an unknown value, then the app falls back to AC1.1.3 or AC1.1.4 and says why (FR2.3).

## Group 2: Set up and choose

### US2.1 (US-1405): Set up Spec Kit in a project. Must
As a developer, I want the app to run `specify init` for my project after a preview, so that I can start a project on Spec Kit from the app. FR3, NFR4.
- AC2.1.1: Given Spec Kit is chosen, when I confirm the preview, then the app runs `specify init --integration <claude|opencode>`. The harness is the project's, and when there are none or two, I pick it in the preview (FR3.1, R-03).
- AC2.1.2: Given `specify` is not on the login shell's `PATH`, then the app says so and names `uv tool install specify-cli`. Nothing is installed (FR3.2).
- AC2.1.3: Given `specify init` fails, then its output is shown and the project stays as it was in the app (FR3.3).
- AC2.1.4: `specify init` is the only thing that writes in `.specify/` or `specs/`. The app's own code never does (NFR3, R-04).

### US2.2 (US-1406): See what is installed, and choose the framework. Must
As a developer opening a project for the first time, I want to see which framework it has and choose the one it follows, so that I start right. FR4.
- AC2.2.1: Given no saved framework, when I open the project, then the app shows AI-DLC, Spec Kit, both or neither, and whether `aidlc` and `specify` are on the `PATH` (FR4.1).
- AC2.2.2: Given exactly one framework, then it is proposed and one click confirms it. Given both, I choose, and the other is not shown. Given neither, I choose and go on to its setup (FR4.2).
- AC2.2.3: Nothing is written in the project before I confirm (FR4.3).

### US2.3 (US-1407): Switch a project from one framework to the other. Should
As a developer, I want to switch the framework from the project settings, so that I can move a project between AI-DLC and Spec Kit. FR8.
- AC2.3.1: When I choose to switch, then a preview shows that the other framework's setup runs if it is missing, that the views change, and that the old files stay (FR8.1).
- AC2.3.2: Given an unfinished intent or a feature with open tasks, then the preview names it and says it is not carried over (FR8.2).
- AC2.3.3: Given the new framework's setup fails, then `.thadeus/project.json` is not changed and the app stays on the old framework (R-05).
- AC2.3.4: After the switch, only the new framework's views show. Switching back works the same way, and nothing is deleted (FR8.3).

## Group 3: Start the first feature (success measure, D2)

### US3.1 (US-1403): Run Spec Kit commands from the app. Must
As a developer, I want the app to offer the next `/speckit-*` command and run it in the agent terminal, so that I don't type every command. FR5.
- AC3.1.1: Given a feature with a spec and no plan, then `/speckit-plan` is offered. With open tasks, `/speckit-implement` is offered. After an implement round, `/speckit-converge` is offered. A click runs it (FR5.1).
- AC3.1.2: The quick commands are:
  - `/speckit-specify`, with a description I type;
  - `/speckit-clarify`, `/speckit-analyze` and `/speckit-constitution`;
  - the commands of each installed extension (FR5.2).
- AC3.1.3: Each command is written in the form the project's harness expects, as confirmed on the test project (FR5.3).
- AC3.1.4: Nothing runs without my click (FR5.4).

## Group 4: See the work and its rules

### US4.1 (US-1402): Spec Kit features: the list and where each stands. Should
As a developer, I want a list of the features with their flow and tasks, so that I see my Spec Kit work at a glance. FR6, NFR3, NFR5, NFR7.
- AC4.1.1: Given folders under `specs/`, then each shows with its number (or timestamp) and its name. The feature named in `feature.json` is marked active. A folder with no recognisable number is listed under its folder name (FR6.1).
- AC4.1.2: Given a feature, then spec, clarify, plan, tasks, implement and converge show as done or not done, and the view says this is worked out from the files (FR6.2).
- AC4.1.3: Given a `tasks.md`, then tasks show grouped by phase, with ID, `[P]`, `[USn]` and tick state, and a done/total count. A malformed line is skipped and counted (FR6.3).
- AC4.1.4: Every file of the feature opens in the artifact reader (FR6.4).
- AC4.1.5: A change under `specs/` shows within 2 seconds, and nothing is written there (FR6.5, NFR3, NFR7).
- AC4.1.6: Given an empty `specs/`, then the view says there are no features yet and offers `/speckit-specify`. Given a Spec Kit version newer than v1.4.x, then a warning names it (NFR5).

### US4.2 (US-1404): Constitution and extensions. Should
As a developer, I want to see the constitution and the installed extensions and hooks, so that I see and change the rules my agents follow. FR7.
- AC4.2.1: Given `.specify/memory/constitution.md`, then it shows rendered and opens in the editor (FR7.1).
- AC4.2.2: Given `.specify/extensions.yml`, then each extension and hook shows with its command, the command it runs before or after, and whether it is optional, mandatory or off (FR7.2).
- AC4.2.3: Given a file that cannot be read, then it is named with the reason (FR7.3).

## Group 5: Cost and agent status

### US5.1 (US-1409): A token log per Spec Kit feature. Should
As a developer, I want token use logged per feature, so that I see what each feature cost. FR9.
- AC5.1.1: Given an active feature, when the agent uses tokens, then the coding tool's session records credit that feature (FR9.1).
- AC5.1.2: Given no active feature, or a `feature.json` that is unreadable or names a missing folder, then readings go to a project-wide bucket named as such (FR9.2, R-06).
- AC5.1.3: The log is kept under `.thadeus/tokens/`, never in `.specify/` or `specs/` (FR9.3).

### US5.2 (US-1410): Waiting questions and agent progress in a Spec Kit project. Should
As a developer, I want the waiting-questions popup and the agent progress to work in a Spec Kit project, so that I see what the agent is waiting on. FR10.
- AC5.2.1: Given a waiting agent dialog from the hooks, then the popup shows its question text and the agent's name, and says it comes from the hooks (FR10.1, R-01).
- AC5.2.2: Given an active feature, then the progress shows its name and its done/total tasks, and says it comes from `tasks.md` (FR10.1, R-01).
- AC5.2.3: Given no hook event and no active feature, then both say "nothing to show yet: no agent hooks or active feature". `agents:progress` does not throw (FR10.2).

## Dependencies and INVEST notes

- **Order:** US1.1 → US1.2 → US2.1 → US2.2 → US3.1 → US4.1 → US5.2 → US5.1 → US4.2 → US2.3. This follows the scope document. US4.1 waits for the test project's facts.
- **Independence:** each story is testable on its own with a fixture project. The dependencies are about build order, not about testing.
- **Size:** each story fits one branch and one pull request (team practice). US1.1 is the largest, since it touches the `isAidlc` call sites.
