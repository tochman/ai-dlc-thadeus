# Requirements: change the plan of an intent that has started (US-0509)

Source: the story in `docs/features/epic-05-workflow-control.md` (its criteria are kept, the one on approval reworded by Q1), the five answers in `requirements-analysis-questions.md` [Q1–Q5], and AI-DLC 2.11.3's own source, read 2026-11-25.

## Intent analysis

Work turns out bigger or smaller than planned. The person wants the right amount of process from here on, without starting over and without knowing AI-DLC's commands. The app shows what would change and types the line. AI-DLC changes the plan, and the person decides.

## What AI-DLC does (the base for FR2 and FR3)

- `/aidlc --scope <plan>` switches the active intent at once, without a question. Finished stages stay. A stage before the current one that never ran is not run. A current stage that the new plan leaves out is skipped. Naming the scope it already has changes nothing. A tailored plan's name (`Plan` in the state file) is removed.
- `/aidlc compose "<task>"` on running work proposes changes to the stages not yet started and stops at approve, edit or reject. The scope stays.

## Functional requirements

### FR1: Where "Change plan" is offered

- **FR1.1** The detail of an intent in flight offers "Change plan". A complete or archived intent, and one missing on disk, missing in the index or with an unreadable state file, does not.
- **FR1.2** For a parked intent it is unavailable, with the reason that the intent must be resumed first [Q5].
- **FR1.3** For the active intent it waits, with its reason, while an agent tab works or a question waits for an answer [Q3]. An open, idle session does not block it. With no session open here, it also waits while another agent has written to the intent in the last 10 minutes (Resume's "elsewhere" rule).
- **FR1.4** For an intent in flight that is not active it waits by Resume's full rule, because it switches the work [Q4].
- **FR1.5** For an intent in a space that is not AI-DLC's active one, or with a harness that has no AI-DLC command, it is unavailable with the reason.
- **FR1.6** Every reason is text that also reaches the keyboard. The rule is asked again when the line is typed; if it blocks then, nothing is typed and the reason is shown.

### FR2: The dialog

- **FR2.1** It names the intent, its current plan (and the plan it is based on, for a tailored one) and the stages already done, and says that these stay done.
- **FR2.2** It offers two ways: a ready-made plan, or a plan tailored to a description.
- **FR2.3** The ready-made plans are those of the Plans view for the agent tab's harness, the project's own first, without the intent's current scope. Each shows its name and description.
- **FR2.4** For the chosen plan it shows, in pipeline order: the stages it adds, the stages it drops, the done stages that stay, and the stages it has that the work has already passed, as "not run" [Q2]. A current stage it drops is named as skipped. When nothing left to do changes, it says so.
- **FR2.5** Reverse Engineering is not counted as added in a new project, as AI-DLC leaves it out there.
- **FR2.6** It says that a ready-made plan is switched at once when the line is sent, so sending it is the approval, and that a tailored plan is approved in the agent tab [Q1].
- **FR2.7** The description is one line of at most 500 characters, and an empty one cannot be sent. It says that a tailored plan changes only the stages not yet started.
- **FR2.8** Reading the plans, no other plan to choose, and a failed read are three different texts. A plan whose stages cannot be read shows the reason and cannot be chosen; the other way still works.
- **FR2.9** Cancel and Escape type nothing. If the intent's state changes while the dialog is open, what it shows follows; if the intent stops being in flight or is parked, the line cannot be typed, with the reason.

### FR3: What is typed

- **FR3.1** Ready-made: `<command> --scope <plan>`. Tailored: `<command> compose "<description>"`. `<command>` is the harness's own (`/aidlc`). The line is typed into the agent tab without Enter, as with Resume, and the dialog closes. When no session is open, one is started first, as Resume does.
- **FR3.2** For an intent that is not active, `<command> intent <folder>` is submitted first and the line is then typed unsent [Q4]. A folder name that is not safe to submit is refused with Resume's reason.
- **FR3.3** The app runs no command and writes no AI-DLC file. Approval and any refusal stay in the agent tab [Q1].

### FR4: The result

- **FR4.1** When AI-DLC has recorded the change, the detail follows live: the plan's name, the stage count, the pipeline's new and dropped stages, and "Step n of m".
- **FR4.2** The "Plan" name shown is never stale: after a switch from a tailored plan, the new plan's name shows.

### FR5: Interface

- **FR5.1** Every text goes through `t()` in `sv.json` and `en.json`, in the LCARS look, with the same dialog as Archive.
- **FR5.2** Every control has a `data-testid` and works from the keyboard. Focus goes back to "Change plan" on cancel, and to the agent tab when a line is typed. Added, dropped and passed stages are told apart by text, not only by colour.
- **FR5.3** The dialog and the detail's actions fit without overflow at a window width of 1280.

## Non-functional requirements

- **NFR1** (security) The plan name must be a valid plan name from the list. The description is typed as one quoted argument with `\` and `"` escaped and every line break and control character removed, so that typing cannot send the line or act on the terminal.
- **NFR2** (tests) Test first, at least 80% line coverage. The stage comparison is a pure function tested without the UI. A Playwright test opens the dialog at 1280 before Code Generation's approval.
- **NFR3** (performance) A plan's stages are read when it is chosen, not for every plan when the dialog opens.

## Constraints

- AI-DLC changes only the active intent of the active space.
- The comparison is the app's preview. AI-DLC decides, and its own output in the agent tab counts.

## Assumptions

- A plan missing in AI-DLC's own list (not compiled for this harness) is refused by AI-DLC in the agent tab; the app does not check it.
- Depth, test strategy and the plan's settings also follow a switch. AI-DLC says which when it switches; the dialog does not list them.

## Out of scope

- Changing the plan of a complete intent (AI-DLC would reopen it) or of a parked one [Q5].
- Naming single stages to skip or add (`--skip`, `--add`), changing depth or settings, saving the changed plan (US-0903 has it).
- The Plans view's own "Change steps".

## Open questions

None.
