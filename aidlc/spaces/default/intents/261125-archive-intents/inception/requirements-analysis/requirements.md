# Requirements: archive and unarchive an intent (US-0513)

Source: the story in `docs/features/epic-05-workflow-control.md` (its acceptance criteria are kept), the four answers in `requirements-analysis-questions.md` [Q1–Q4], and AI-DLC 2.11.3's own archive command, read from its source.

## Intent analysis

The person has 64 intents, 63 of them complete, and the list shows them all. They want to see only the work that still matters, without losing the record of the rest. Archiving is their decision each time: the app never archives by itself. It goes through AI-DLC's own command, so the audit trail and the refusals are AI-DLC's.

## Functional requirements

### FR1: Archive one intent

- **FR1.1** The detail of an intent that is in flight, parked or complete offers "Archive". It is not offered for an intent that is missing on disk or has no row in `intents.json`.
- **FR1.2** A confirmation names the intent, says that nothing is deleted, warns when the intent is unfinished and when it is the active one, and has an optional reason. Cancel and Escape change nothing.
- **FR1.3** Confirming runs `aidlc intent archive <dirName>`, with `--reason <text>` only when the trimmed reason is not empty. The reason is one line of at most 200 characters; line breaks become spaces, and a reason that starts with `-` is refused with a message.
- **FR1.4** Archive is unavailable, with its reason shown, for the active in-flight intent by the same rule as Resume today: any busy or asking agent tab, an open agent session, or an audit write in the last 10 minutes by an agent outside the app [Q3]. A parked active intent is not blocked by the last two, as with Resume. A complete intent, and an in-flight one that is not active, is not blocked.
- **FR1.5** When AI-DLC refuses or the command times out, the app shows AI-DLC's words and the intent stays as it was. Main checks FR1.4 again itself, from what it can see, before it runs the command.
- **FR1.6** After the active intent is archived, none is active: nothing shows as running, and no question or handoff from it waits. The same holds when this clone's `active-intent` still names an intent another clone archived.

### FR2: Unarchive

- **FR2.1** An archived intent's detail opens with its pipeline, timeline, artifacts and cost, carries an "Archived" mark and offers "Unarchive". It has no Archive, Resume, Park or Unpark.
- **FR2.2** Unarchive runs `aidlc intent unarchive <dirName>` without a confirmation; the list and the detail then show the intent as running or complete again. A refusal is shown as in FR1.5.

### FR3: The list

- **FR3.1** The list leaves out archived intents, and its count is the count of the others.
- **FR3.2** The status filter has a choice "Archived (N)", in the interface's language, when N is at least 1 [Q2]. It shows the archived intents only; every other choice, "all statuses" included, leaves them out. The search, the plan filter and the sort work inside it.
- **FR3.3** When the last archived intent is unarchived while that choice is on, the filter goes back to all statuses.
- **FR3.4** Archiving the selected intent keeps its detail open, now with Unarchive.
- **FR3.5** The list follows the files live, also when an agent or a pull archives or unarchives an intent.

### FR4: Archive several

- **FR4.1** The list has a "Select" mode: every visible complete intent gets a checkbox, the others none [Q1]. "Select all" takes the visible ones; a choice made before the search or a filter changes is kept, and the count says how many are chosen.
- **FR4.2** "Archive N" opens one confirmation that lists the chosen intents, with one optional reason for all of them. It is unavailable with nothing chosen.
- **FR4.3** The intents are archived one at a time, in list order, with progress ("12 of 60"). A refused one does not stop the rest. The result says how many were archived and names each refused one with AI-DLC's reason.
- **FR4.4** A second start is not possible while one runs. Closing the confirmation does not stop the run. Select mode ends when it is done.

### FR5: Commit

- **FR5.1** After an archive (one or several) or an unarchive, with the checkout on `main`, the app commits exactly the files the command changed (`intents.json`, and each intent's `aidlc-state.md` and audit file) as one commit: `chore: archive N intents`, or `chore: archive <slug>` and `chore: unarchive <slug>` for one [Q4]. What the person has staged is left alone.
- **FR5.2** The commit reaches origin through the push the planning sync already does for `main`; the app has no second push path. On a protected `main`, without a remote or offline, the commit stays local and the result says so.
- **FR5.3** On any other branch, with a detached HEAD, or outside a git repository, the app commits nothing and the result says that the files are changed and need a commit.
- **FR5.4** When `intents.json` had uncommitted changes before the archive (such as a new intent's row), the app commits nothing and says why. Earlier uncommitted lines in the archived intent's own state and audit files go along.
- **FR5.5** A refused commit (a hook, a lock) is shown with git's reason; the archive itself stands.

### FR6: Archived intents still count

- **FR6.1** Cost, token history, velocity and story links count an archived intent as before.
- **FR6.2** An intent whose `Archived From` is `Completed` counts as delivered and finished in the app and in `tests/main/featureDocsStatus.test.js`. Any other archived intent counts as neither delivered nor in progress.

### FR7: Interface

- **FR7.1** Every text goes through `t()` in `sv.json` and `en.json`. The look is LCARS: pills for actions, the shared dialog for confirmations, a mark as text and not colour alone.
- **FR7.2** Every control has a `data-testid` and works from the keyboard. Focus goes back to the control that opened a confirmation, or to the list when that control is gone.

## Non-functional requirements

- **NFR1** (security) Commands run through `runFixed`, without a shell, with a 20 s timeout each. The intent's name is checked against the space's list, as Unpark does. The app never edits AI-DLC's files.
- **NFR2** (performance) The list with 100 intents, 60 of them archived, opens and filters as fast as before: no new file reads beyond the state file already read.
- **NFR3** (tests) Test first, at least 80% line coverage, and a failing test for each FR6.2 reader before its change. One run of AI-DLC's real archive and unarchive commands is done in a throwaway project before the pull request.

## Constraints

- AI-DLC 2.11.3 archives in its active space only. In another space the app offers neither action and says why.
- The command writes the audit first, then the state, then `intents.json`. A timeout can stop it in between; the app then shows what the files say.

## Assumptions

- A parked intent that is archived and brought back shows as parked again: AI-DLC sets it to `Running`, and the app reads parking from the audit log, where the last park event stands.
- `aidlc intent archive` needs no agent session. Read from its source, not yet run; NFR3 covers it.
- An AI-DLC without the command answers with an error, which FR1.5 shows; no version check is added.

## Out of scope

- Archiving automatically, or by age; deleting an intent; archiving several unfinished intents at once; unarchiving several at once; archived intents in the Spec Kit views (US-1411).

## Open questions

None.
