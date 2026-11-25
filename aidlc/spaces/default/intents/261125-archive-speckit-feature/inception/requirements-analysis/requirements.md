# Requirements: archive and unarchive a Spec Kit feature (US-1411)

Source: the story in `docs/features/epic-14-spec-kit.md` (its acceptance criteria are kept, the one on the token log reworded by Q3), the six answers in `requirements-analysis-questions.md` [Q1–Q6], and the code as US-0513 left it.

## Intent analysis

Spec Kit has no archive and no state file, so every folder under `specs/` stays in the list. The person wants to see only the features that still matter and to bring one back when they need it. Archiving is the app's own mark: it hides the feature in the app, and Spec Kit does not know about it.

## Functional requirements

### FR1: Archive a feature

- **FR1.1** The detail of a feature that is neither active nor archived offers "Archive".
- **FR1.2** A confirmation names the feature and says that only the app hides it and that its files stay where they are. With open tasks it also warns how many; with none, or no `tasks.md`, it has no warning. There is no reason field. Cancel and Escape change nothing.
- **FR1.3** For the active feature, Archive is unavailable and says why, as text that also reaches the keyboard. With no active feature (`feature.json` missing or unreadable), every feature can be archived.
- **FR1.4** Main checks again when the confirmation is sent: the folder is a listed feature and is not the active one now. Otherwise nothing is written and the reason is shown. A failed write is shown with its reason and the feature stays as it was.

### FR2: Unarchive

- **FR2.1** An archived feature's detail opens with its flow, tasks and files. It carries an "Archived" mark as text, offers "Unarchive", and has no Archive, no next command and no note about which feature is active.
- **FR2.2** Unarchive removes the mark without a confirmation; the list shows the feature again. A failed removal is shown with its reason. A mark already gone counts as done.
- **FR2.3** When the app sees that an archived feature is the active one, it removes the mark, so the feature also stays in the list when another becomes active [Q2]. Until that is done, and when the removal fails, an active feature still shows as not archived. A failed removal is logged and never hides the list.

### FR3: The list

- **FR3.1** The list, the count at the foot of the left arm ("N features") and the first selection leave archived features out.
- **FR3.2** A filter above the list has "All features" and "Archived (N)", and shows only when N is at least 1 [Q1]. "Archived (N)" shows the archived features only, each with an "Archived" mark.
- **FR3.3** When the last archived feature comes back while "Archived" is chosen, the filter goes back to all features.
- **FR3.4** When every feature is archived, the list says so and points at the filter, instead of the "no features yet" text.
- **FR3.5** Archiving or unarchiving the selected feature keeps its detail open.
- **FR3.6** The list follows the marks live, also when a pull or another window changes them.
- **FR3.7** The framework switch (US-1407) does not list an archived feature as work in progress, as it already leaves out archived intents.

### FR4: The mark

- **FR4.1** Each archived feature has one file, `.thadeus/archived/<feature folder>.json` [Q5]. Its content is fixed (`{"version": 1}`), with no time or person in it, so the same archive on two clones is the same file. Only the file's presence counts; its content is not read.
- **FR4.2** Nothing is written in `.specify/` or `specs/`.
- **FR4.3** A mark whose feature folder is gone is ignored: it is not counted, shown or removed. If the folder comes back, the feature is archived again.
- **FR4.4** When `.thadeus/archived/` is missing, no feature is archived. When it cannot be read, or is not a plain folder, every feature shows, and the reason stands with the view's other read errors.
- **FR4.5** The marks reach the other clones through the app's present `.thadeus/` sync (US-0609): `main`, or the planning branch when `main` is protected. This story adds no push path and no commit of its own [Q6].

### FR5: What archiving leaves alone

- **FR5.1** An archived feature's files open in the reader as before.
- **FR5.2** `.thadeus/tokens/speckit-<feature>.json` is neither changed nor moved by archiving, still opens in the editor, and still takes readings [Q3].

### FR6: Interface

- **FR6.1** Every text goes through `t()` in `sv.json` and `en.json`, in the LCARS look: the shared dialog, pills, and the same select as the intent list.
- **FR6.2** Every control has a `data-testid` and works from the keyboard. Focus goes back to the control that opened the confirmation, or to the list when that control is gone.

## Non-functional requirements

- **NFR1** (security) The feature folder's name from the renderer is checked against the folders listed under `specs/` before it becomes a path. A symlinked `.thadeus/` or `.thadeus/archived/`, or a mark that is not a regular file, is refused when writing or removing and ignored when reading. Writing is atomic.
- **NFR2** (performance) Reading the marks is one folder listing per load, with no read per feature.
- **NFR3** (tests) Test first, at least 80% line coverage, and the existing test that the features reader writes nothing stays green.

## Constraints

- Depends on US-0513's "Archived (N)" wording, look and dialog shell, not its archive run: there is no command, reason, progress or commit here.

## Assumptions

- A feature that was active only while no copy of the app had the project open keeps its mark and hides again: FR2.3 works on what the app sees.
- When a teammate archives a feature that is active here, this app removes the mark for everyone. Somebody works on it, so it still matters.
- A feature that is not active is not being worked on, so a busy agent does not block Archive. Hiding changes nothing the agent reads.
- The same feature archived on one clone and unarchived on another resolves by which change reaches origin last; both states are harmless.
- Folder names are compared in Unicode NFC, as git and macOS may store them differently.

## Out of scope

- Archiving several features at once, a reason, automatic archiving, deleting a feature.
- A view of a feature's tokens and cost, or a project total [Q3]; a story of its own when asked for.
- Recognising a ruleset that requires pull requests on `main` [Q6]: US-0054 in EPIC-00.
- The community extension `archive`.

## Open questions

None.
