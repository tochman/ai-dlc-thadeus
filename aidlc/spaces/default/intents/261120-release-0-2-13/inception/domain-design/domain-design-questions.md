# Domain Design questions: Release v0.2.13

Five small stories, mostly changes to existing modules. These questions settle where the new parts live. US-0035 (the slow login shell) has one sensible home, `exec.js` with `tools.js` reporting the fallback, so it is not asked.

## Q1. [Developer] Where the planning views read `main`'s releases (US-0036)
On a story branch, the Releases view must show the planning from `origin/main` (or the docs branch) without changing the checkout (FR2.1). Today `features.js` reads the files on disk only.

A. Give the Features Loader a source: it reads each planning file through `git show origin/<target>:<path>` when the checkout is not the target, then lays the branch's own story blocks on top (recommended: one loader, one shape for the renderer)
B. A new Planning Reader module beside the loader that builds the target's view and hands the loader a merged result
C. Read the target in the planning worktree that `planningSync` already makes, and load from there
X. Other (please specify)

[Answer]: A

## Q2. [Developer] Where the `.thadeus/` sync lives (US-0609)
Every file under `.thadeus/` must be committed and pushed through US-0608's record and commit path (FR3.1), on the app's own branch in a worktree when a story branch is checked out (FR3.4).

A. Extend Planning Sync: one path table (the docs paths, `.thadeus/`, the harness settings rows) decides what the record and the cycle carry; the worktree, rebase and push stay as they are (recommended: one commit path, one waiting count)
B. A new `.thadeus` Sync module with its own record and cycle that calls Planning Sync's worktree and push helpers
C. A separate scheduler and commit for `.thadeus/`, sharing only the Git Reader
X. Other (please specify)

[Answer]: B

## Q3. [Developer] Committing only the app's hook entries (US-0609 FR3.2)
When the installer changes `.claude/settings.json` or `.opencode/plugins/thadeus-dialog.js` and the person has other edits there, only the app's entries may be committed. Requirements assumed this means: take `main`'s version of the file and change only the app's spans with the existing settings splicer in the Agent Hooks Installer.

A. Yes: the installer's splicer builds the committed text from `main`'s version; the person's other edits stay in the working tree and are named (recommended)
B. Commit the whole file, but only when it has no other edits; otherwise wait and say why
X. Other (please specify)

[Answer]: A

## Q4. [Developer] How the app knows an intent is parked (US-0510 FR4.1, FR4.6)
AI-DLC writes no "parked" field in `aidlc-state.md`; parking and unparking are `WORKFLOW_PARKED` / `WORKFLOW_UNPARKED` events in the audit log.

A. Read it from the audit events: the last of the two wins, with the stage from the parked event; the intents watcher already follows the audit, so the mark is live (recommended)
B. Ask AI-DLC with `aidlc --status` for each intent when the list loads
X. Other (please specify)

[Answer]: B

## Q5. [Developer] The other assumptions from Requirements
- `.DS_Store` and editor swap files under `.thadeus/` are not committed.
- Park and unpark are only ever run with fixed arguments, never `--help`.
- Unpark on an intent that is not active switches the active intent without a confirm, and says so in one line.

A. Accept assumptions
B. Convert to follow-up questions
X. Other (please specify)

[Answer]: A

## Q6. [Designer] The fold toggle and where its state is kept (US-0415)
Every view with a list column gets the same LCARS toggle (FR5.1); the state is per view, the same in every project, across restarts (FR5.3).

A. One shared `ListColumn` component that wraps a view's list and owns the toggle and the strip; the state is kept in the app settings (`userData/settings.json`, one key per view) (recommended: one component, settings already survive restarts)
B. The same shared component, with the state in the renderer's `localStorage`
C. A `useFold(viewId)` hook plus shared CSS classes, with each view placing the toggle itself
X. Other (please specify)

[Answer]: C

## Q7. [Developer] Keeping the Parked mark live with `aidlc --status` (follow-up to Q4)
You chose `aidlc --status` (Q4: B). The mark must also appear without a reload when an agent parks in the terminal (FR4.6), and on intents that are not active (FR4.1).

A. Run `aidlc --status` again (fixed arguments, with a timeout) each time the intents watcher sees an audit change, for the intent that changed
B. Use `aidlc --status` when the list loads and the audit events for live changes in between
C. Run it only on load and on the app's own Park and Unpark; an agent's park shows on the next reload
X. Other (please specify)

[Answer]: B

## Q8. [Developer] What the new `.thadeus` Sync shares with Planning Sync (follow-up to Q2)
You chose a new module with its own record and cycle (Q2: B). Requirements say the commit goes "through US-0608's record and commit path" (FR3.1) and the waiting changes show with the planning changes (FR3.8).

A. Its own record file in the same format, written with Planning Record's functions; its own cycle reuses Planning Sync's worktree, rebase and push helpers; the waiting count adds both records
B. Planning Record's file is shared (a `.thadeus` entry kind); only the cycle and scheduler are its own
X. Other (please specify)

[Answer]: B

## Q9. [Designer] Where `useFold` keeps the folded state (follow-up to Q6)
You chose a `useFold(viewId)` hook with shared CSS (Q6: C). The state must be per view, the same in every project, and survive a restart (FR5.3).

A. The app settings (`userData/settings.json`, one key per view), read and written through the bridge
B. The renderer's `localStorage`, one key per view
X. Other (please specify)

[Answer]: A
