# Requirements: Release v0.2.13 (code stories)

## Intent analysis

Smoother daily use of the app, as five small, independent stories from `docs/releases/0.2.13.md`, each its own Unit, branch and pull request, built in the release's order: US-0035, US-0036, US-0609, US-0510, US-0415. The full acceptance criteria stay in the epic files; this document adds the decisions from the questions (`[Qn]`) and the corners, and gives each criterion a stable ID. US-1103 and US-1102 (docs only) are outside this workflow. [desc]

Sources: Initial description: the workflow's request [desc]; the stories in `docs/features/epic-00-fixes.md`, `epic-06-feature-docs.md`, `epic-05-workflow-control.md`, `epic-04-branding-and-desktop.md`; answers in `requirements-analysis-questions.md` [Q1]–[Q6].

## Functional requirements

### FR1 — US-0035: the app finds the agent CLIs when the login shell is slow
- **FR1.1** When the login shell does not answer in time, that call uses the app's own PATH and the result is not kept; the next lookup asks the login shell again.
- **FR1.2** A scan in Settings › Tools reads the PATH from the login shell again.
- **FR1.3** The login shell gets 20 s to answer (was 5 s). [Q5]
- **FR1.4** Lookups that start while a login-shell read is running wait for that same read; only one shell runs at a time.
- **FR1.5** When the fallback PATH was used, the tool's row says the login shell's PATH could not be read.

### FR2 — US-0036: on a story branch, the planning views show main's releases
- **FR2.1** With a story branch checked out, the Releases view and the epic and story statuses show the planning from `origin/<docs branch>` when one is set, else `origin/main`, read with git without changing the checkout, with the branch's own story blocks on top. [Q2]
- **FR2.2** A release or story added on that branch by another clone shows after the next fetch, with no merge into the story branch.
- **FR2.3** A queued planning change whose file is older than the read branch's, with nothing newer in it, is dropped by the app instead of offered as "Use mine".
- **FR2.4** The view names the branch its planning comes from.
- **FR2.5** With no remote, or before the first fetch, the views read the local target branch, and the label says so.

### FR3 — US-0609: the app's files and harness settings are kept in sync with `main`
- **FR3.1** Every file under `.thadeus/`, whoever wrote it, is committed and pushed to `origin/main` (or the docs branch when `main` is protected) within the push interval, or sooner when idle, through US-0608's record and commit path. [Q3]
- **FR3.2** When the installer adds or updates its hook entries in `.claude/settings.json` or `.opencode/plugins/thadeus-dialog.js`, that change is committed the same way, and only the app's own entries are staged; other edits in the same file are left and named. The harness file list is one table, so a later harness joins by one row. [Q6]
- **FR3.3** When the committed harness settings lack the app's current hook entries, the app says so and offers Install or Update (US-0214); the result is committed.
- **FR3.4** On a story branch, the commit is made on the app's own branch in a temporary worktree; the story's branch, index and working tree are untouched, and `.thadeus/` never lands in a story commit.
- **FR3.5** A growing token log is committed in batches, one `chore: sync .thadeus` commit per push.
- **FR3.6** A push that meets a newer `main` rebases its commit and merges token readings without losing any; a real conflict keeps the record, names the file and pushes nothing.
- **FR3.7** At project setup, the project gets the rule that `.thadeus/` is committed and never ignored; a `.gitignore` entry that hides it is reported.
- **FR3.8** The release list (or status strip) shows waiting `.thadeus` changes with US-0608's planning changes.

### FR4 — US-0510: park and unpark an intent from the app
- **FR4.1** A parked intent's row and detail show an LCARS "Parked" mark with the stage it was parked at.
- **FR4.2** The active intent, when in flight, offers "Park", run as `aidlc engine orchestrate park --person-asked` with fixed arguments. Other intents offer no Park. [Q1]
- **FR4.3** Any parked intent offers "Unpark". On an intent that is not active, the app first makes it active through `aidlc intent <name>`, then runs `aidlc engine state unpark`, and says that it is now the active intent. [Q1]
- **FR4.4** "Resume" on a parked intent unparks it first, so `/aidlc --resume` carries on without the "workflow is parked" stop.
- **FR4.5** When a command fails or AI-DLC refuses, the app shows the reason and changes nothing more (a switch already made is named).
- **FR4.6** The mark follows the files live, also when an agent parks or unparks.

### FR5 — US-0415: fold the list column
- **FR5.1** Every view with a list column has one shared LCARS toggle at the list's edge that folds it to a narrow strip; the main view takes the freed width.
- **FR5.2** The toggle, or a click on the strip, brings the list back with its search, filters, sort and selection unchanged.
- **FR5.3** The folded or open state is kept per view, the same in every project, across restarts. [Q4]
- **FR5.4** The toggle works by keyboard, has `aria-expanded` and an accessible name, and the motion respects reduced motion.

## Non-functional requirements

- **NFR1** Every new text goes through `t()` with the same keys in `sv.json` and `en.json` (`i18nKeys.test.js` passes).
- **NFR2** Every new control has a `data-testid` shaped `<component>-<role>`, and follows the LCARS look; no native `title=`.
- **NFR3** Each story's change has a test that fails without it (TDD); the full suite, ESLint and Prettier stay green, and line coverage stays at or above 80%.
- **NFR4** AI-DLC is changed only through its own CLI with fixed arguments; the app never edits engine-owned files.
- **NFR5** No subprocess the app starts runs without a timeout; the 20 s login-shell limit is the longest.

## Constraints

- Each story is its own Unit, `feat/`/`fix/` branch and squash-merged pull request; when two are open, `main` is merged into the later one and the suite rerun before its Build and Test is approved.
- Electron, React, vitest and Playwright as today; no new dependencies.
- US-0609 builds on US-0036's planning read and US-0608's record; it is built after US-0036.

## Assumptions

- **[assumption]** `.DS_Store` and editor swap files under `.thadeus/` are skipped by FR3.1: they are OS noise, not data.
- **[assumption]** "Only the app's own entries are staged" (FR3.2) means the committed file is `main`'s version with only the app's spans changed, using the existing settings splicer.
- **[assumption]** Park and unpark ignore `--help` and run (seen 2026-11-20), so the app always calls them with fixed arguments only, never to probe them.
- **[assumption]** Switching the active intent for an Unpark (FR4.3) is acceptable without a confirm: it is the person's own click and is said in one line.

## Out of scope

- US-1103 and US-1102 (docs only).
- Harnesses other than Claude Code and opencode for FR3.2.
- Parking an intent that is not active.
- A keyboard shortcut for the fold toggle.

## Open questions

None.
