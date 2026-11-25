# User Stories: archive and unarchive an intent (US-0513)

Seven stories, all **Must Have**, built in this order on one branch and one pull request. Requirement IDs are from `requirements.md`.

Every story also meets: texts through `t()` in `sv.json` and `en.json`, the LCARS look, marks as text (FR7.1); a `data-testid` and keyboard use for every control, with focus back where it came from (FR7.2); a test that fails first, 80% coverage (NFR3). "Archived" in a criterion means a fixture can set it up, so each story is tested alone.

## US1.1: Archive one intent
As **Dana (P1)**, I want **to archive an intent from its detail, with a reason if I like**, so that **it leaves my list without losing its record**.
- **AC1.1.1** Given an intent in flight, parked or complete, when its detail shows, then it offers "Archive". Given one missing on disk or with no row in `intents.json`, then it does not. (FR1.1)
- **AC1.1.2** Given I press Archive, when the confirmation opens, then it names the intent, says that nothing is deleted, and warns if the intent is unfinished and if it is the active one. Cancel and Escape run no command. (FR1.2)
- **AC1.1.3** Given I confirm, then the app runs `aidlc intent archive <dirName>` without a shell and with a 20 s limit, after it checked the name against the space's list; the intent becomes archived and its detail stays open. (FR1.3, FR3.4, NFR1)
- **AC1.1.4** Given a reason of spaces only, then no `--reason` is sent; line breaks become spaces; 200 characters is accepted and 201 is not; one that starts with `-` is refused with a message and what I typed is kept. (FR1.3)
- **AC1.1.5** Given AI-DLC refuses or the 20 s pass, then the app shows AI-DLC's words, or that the time ran out, and the intent shows what its files say. (FR1.5)
- **AC1.1.6** Given the project is in a space that is not AI-DLC's active one, then neither Archive nor Unarchive is offered and the reason is shown. (Constraints)
- **Dependencies:** none. **INVEST:** small; one command, one dialog.

## US1.2: No archiving under a working agent
As **Dana (P1)**, I want **Archive to be unavailable while an agent has the intent, and nothing left running afterwards**, so that **no agent is stranded on an archived intent**.
- **AC1.2.1** Given the active in-flight intent and a busy or asking agent tab, an open agent session, or an outside agent's audit write in the last 10 minutes, then Archive is unavailable and says which. (FR1.4)
- **AC1.2.2** Given a parked active intent with an open session, a complete intent, or an in-flight one that is not active, then Archive is available. (FR1.4)
- **AC1.2.3** Given an agent starts while my confirmation is open, when I confirm, then main checks again, runs nothing and shows the reason. (FR1.5)
- **AC1.2.4** Given the active intent is archived, then no intent is active, nothing shows as running, and no question or handoff from it waits in the popup. (FR1.6)
- **AC1.2.5** Given Sam (P2) pulls an archive of the intent that this clone's `active-intent` names, then the same holds. (FR1.6)
- **Dependencies:** US1.1. **INVEST:** small; reuses Resume's rule.

## US2.1: Look at an archived intent and bring it back
As **Dana (P1)**, I want **to open an archived intent and unarchive it**, so that **archiving is never a dead end**.
- **AC2.1.1** Given an archived intent, when I open it, then its pipeline, timeline, artifacts and cost show, with an "Archived" mark and "Unarchive"; there is no Archive, Resume, Park or Unpark. (FR2.1)
- **AC2.1.2** Given I press Unarchive, then `aidlc intent unarchive <dirName>` runs without a confirmation, and list and detail show the intent as running or complete, as it was. (FR2.2)
- **AC2.1.3** Given it was parked before, then it shows as parked again. (Assumptions)
- **AC2.1.4** Given AI-DLC refuses, then its words show and the intent stays archived. (FR2.2)
- **Dependencies:** none (an archived intent can come from the terminal). **INVEST:** small.

## US3.1: A list without archived intents
As **Dana (P1)**, I want **the list to leave archived intents out and show them when I ask**, so that **I see only the work that still matters**.
- **AC3.1.1** Given 64 intents, 60 archived, when the list opens, then it shows 4 and its count is 4; every status choice but "Archived (60)" leaves the 60 out, "all statuses" included. (FR3.1, FR3.2)
- **AC3.1.2** Given the choice "Archived (60)", then only those show, and search, plan filter and sort work inside it. With none archived the choice is not there. (FR3.2)
- **AC3.1.3** Given that choice is on, when the last archived intent is unarchived, then the filter goes back to all statuses. (FR3.3)
- **AC3.1.4** Given an agent or a pull archives or unarchives an intent, then list and count follow without a reload. (FR3.5)
- **AC3.1.5** Given every intent is archived, then the empty list says so and names the "Archived" choice. [assumption]
- **AC3.1.6** Given 100 intents, 60 archived, then opening and filtering reads no file beyond the state file read today. (NFR2)
- **Dependencies:** none. **INVEST:** small; one filter.

## US4.1: Archive several complete intents in one go
As **Dana (P1)**, I want **to choose many complete intents and archive them with one confirmation**, so that **60 finished intents take one action, not 60**.
- **AC4.1.1** Given Select mode, then each visible complete intent has a checkbox and no other has; "Select all" takes the visible ones; a choice outlives a change of search or filter, and the count says how many are chosen. (FR4.1)
- **AC4.1.2** Given nothing chosen, then "Archive N" is unavailable. Given some, then one confirmation lists every chosen intent, hidden ones too, with one optional reason for all, by US1.1's rules. (FR4.2)
- **AC4.1.3** Given 60 chosen, when I confirm, then they are archived one at a time in list order, with "12 of 60"; a refused or timed-out one does not stop the rest. (FR4.3)
- **AC4.1.4** Given two were refused, then the result says 58 were archived and names the two with AI-DLC's reasons, and Select mode ends. (FR4.3, FR4.4)
- **AC4.1.5** Given a run goes on, then a second start is not possible, and closing the confirmation does not stop it. (FR4.4)
- **Dependencies:** US1.1. **INVEST:** medium; list mode and a serial run.

## US5.1: The app commits what archiving changed
As **Dana (P1)**, I want **the changed AI-DLC files committed for me on `main`**, so that **my checkout stays clean and Sam (P2) gets the same list**.
- **AC5.1.1** Given `main`, when one intent or several were archived, or one unarchived, then exactly the changed `intents.json`, `aidlc-state.md` and audit files go in one commit: `chore: archive <slug>`, `chore: archive N intents` or `chore: unarchive <slug>`. N counts the archived ones, not the refused. What I have staged stays staged. (FR5.1)
- **AC5.1.2** Given the commit, then the planning sync's own push takes it to origin; on a protected `main`, with no remote or offline, it stays local and the result says so. (FR5.2)
- **AC5.1.3** Given another branch, a detached HEAD or no git, then nothing is committed and the result says that the files are changed and need a commit. (FR5.3)
- **AC5.1.4** Given `intents.json` had uncommitted changes before, then nothing is committed and the result says why; earlier lines in the intent's own state and audit files alone do not stop it. (FR5.4)
- **AC5.1.5** Given a hook or lock refuses the commit, then git's reason shows and the archive stands. (FR5.5)
- **AC5.1.6** Given every chosen intent was refused, then there is no commit. (FR5.1)
- **Dependencies:** US1.1, US2.1, US4.1 (each ends in this commit; tested with a set of changed files). **INVEST:** medium; one commit path.

## US6.1: Archived work still counts
As **Sam (P2)**, I want **archived intents kept in every figure**, so that **tidying the list does not rewrite history**.
- **AC6.1.1** Given an archived intent, then project cost, token history, velocity and story links are the same as before it was archived. (FR6.1)
- **AC6.1.2** Given `Archived From` is `Completed`, then the intent counts as delivered and finished in the app and in `tests/main/featureDocsStatus.test.js`. (FR6.2)
- **AC6.1.3** Given it is anything else, then the intent counts as neither delivered nor in progress. (FR6.2)
- **Dependencies:** none. **INVEST:** small; each reader gets a failing test before its change.

## Assumptions
- AC3.1.5 is new here: the list must say how many are archived (US-0513), and a bare empty list would mislead.
- AC6.1.2 replaces US-0303's "archived is not finished" (`stateFinished` in `src/main/projectService.js`) for intents that were complete; AC6.1.1's "the same as before" depends on it.
- The reason and date of an archive show in the timeline, as AI-DLC's own event; the detail does not repeat them.
- If the app quits during a run, the finished ones stay archived and uncommitted; the next archive then meets AC5.1.4 and says why.
- NFR3's real run of AI-DLC's commands is proven in Build and Test. AI-DLC's checks stop an agent from archiving, so the person may have to run it.
