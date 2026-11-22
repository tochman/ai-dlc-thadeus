# User Stories: Release v0.2.13

One story per release story, built in this order, each its own Unit, branch and pull request. All are **Must Have**. Every story also meets NFR1 (texts through `t()` in `sv.json` and `en.json`), NFR2 (LCARS look, `data-testid` `<component>-<role>`), NFR3 (a test that fails first; suite, ESLint, Prettier green; coverage ≥ 80%). Requirement IDs are from `requirements.md`.

## US1.1 — The app finds the agent CLIs when the login shell is slow (US-0035)
As **Dana (P1)**, I want **the app to find `claude` on my login shell's PATH, and look again when I scan**, so that **the agent tabs start right after I open the app**.
- **AC1.1.1** Given the login shell does not answer within 20 s, when a tool is looked up, then the app's own PATH is used for that call only, and the next lookup asks the login shell again. (FR1.1, FR1.3)
- **AC1.1.2** Given a slow login shell that answers in 8 s, when a tool is looked up, then the login shell's PATH is used. (FR1.3)
- **AC1.1.3** Given a scan in Settings › Tools, when it runs, then the PATH is read from the login shell again, so a tool installed while the app runs is found. (FR1.2)
- **AC1.1.4** Given three lookups start while one login-shell read runs, when it answers, then all three use that answer and only one shell was started. (FR1.4)
- **AC1.1.5** Given the fallback PATH was used, when the Tools view shows the tool, then its row says the login shell's PATH could not be read. (FR1.5)
- **Dependencies:** none. **INVEST:** small, one module pair (`exec.js`, `tools.js`) and one row.

## US2.1 — On a story branch, the planning views show main's releases (US-0036)
As **Dana (P1)**, I want **the Releases and Features views to show the planning on `main` while a story branch is checked out**, so that **I can use a release as soon as it is on `main`**.
- **AC2.1.1** Given a story branch is checked out and `main` is not protected, when the Releases view loads, then it shows the planning from `origin/main`, read with git without changing the checkout, with the branch's own story blocks on top. (FR2.1)
- **AC2.1.2** Given a docs branch is set (main protected), when the views load, then they read `origin/<docs branch>`. (FR2.1)
- **AC2.1.3** Given a release is added on `main` by another clone, when the app has fetched, then the release shows, with no merge into the story branch. (FR2.2)
- **AC2.1.4** Given the sync queue holds an older copy of a file than the read branch, with nothing newer in it, when the cycle runs, then the app drops it and offers no "Use mine". (FR2.3)
- **AC2.1.5** Given any branch, when the view shows planning, then it names the branch the planning comes from; with no remote it names the local branch. (FR2.4, FR2.5)
- **Dependencies:** none. **INVEST:** small, the planning read path only.

## US3.1 — The app's files and harness settings are kept in sync with `main` (US-0609)
As **Sam (P2)**, I want **every file under `.thadeus/` and the app's hook entries in the harness settings committed and pushed by the app**, so that **every clone has the hooks, no token reading is lost, and nothing of the app's lands in a story commit**.
- **AC3.1.1** Given the app writes a file under `.thadeus/`, when the push interval passes or the app is idle, then it is committed and pushed to `origin/main` (or the docs branch), through US-0608's record. `.DS_Store` and swap files are skipped. (FR3.1)
- **AC3.1.2** Given the installer updates its entries in `.claude/settings.json` or `.opencode/plugins/thadeus-dialog.js` while the person has other edits in that file, when it commits, then only the app's entries are committed and the other edits are left and named. (FR3.2)
- **AC3.1.3** Given a clone whose committed settings lack the app's current hook entries, when the project opens, then the app says so and offers Install or Update, and the result is committed. (FR3.3)
- **AC3.1.4** Given a story branch is checked out, when `.thadeus/` changes are committed, then the commit is made in a temporary worktree on the app's own branch, and the story's branch, index and working tree are unchanged. (FR3.4)
- **AC3.1.5** Given a token log gets 50 readings between two pushes, when the push runs, then they go in one `chore: sync .thadeus` commit. (FR3.5)
- **AC3.1.6** Given two machines added readings to the same token log, when the second push meets a newer `main`, then it rebases and keeps every reading from both; a real conflict keeps the record, names the file and pushes nothing. (FR3.6)
- **AC3.1.7** Given the app is set up on a project, when setup runs, then the project gets the rule that `.thadeus/` is committed, and a `.gitignore` entry that hides it is reported. (FR3.7)
- **AC3.1.8** Given `.thadeus` changes wait to be pushed, when the release list shows, then they appear with the planning changes. (FR3.8)
- **Dependencies:** after US2.1 (shared planning read and commit path). **INVEST:** medium; the largest Unit, still one user goal.

## US4.1 — Park and unpark an intent from the app (US-0510)
As **Dana (P1)**, I want **to park the active intent and unpark any parked one from the app**, so that **I can stop and resume without typing AI-DLC commands**.
- **AC4.1.1** Given a parked intent, when its row or detail shows, then it carries an LCARS "Parked" mark with the stage it was parked at. (FR4.1)
- **AC4.1.2** Given the active intent is in flight, when I press Park, then the app runs `aidlc engine orchestrate park --person-asked` with fixed arguments and the mark appears. Other intents offer no Park. (FR4.2)
- **AC4.1.3** Given a parked intent that is not active, when I press Unpark, then the app runs `aidlc intent <name>`, then `aidlc engine state unpark`, and says it is now the active intent. (FR4.3)
- **AC4.1.4** Given a parked intent, when I press Resume, then it is unparked first and `/aidlc --resume` carries on without the parked stop. (FR4.4)
- **AC4.1.5** Given AI-DLC refuses (for example mid-stage), when I press Park, then the app shows its reason and nothing else changes. (FR4.5)
- **AC4.1.6** Given an agent parks the intent in the terminal, when the files change, then the mark appears without a reload. (FR4.6)
- **Dependencies:** none. **INVEST:** small.

## US5.1 — Fold the list column (US-0415)
As **Dana (P1)**, I want **to fold away the list column and bring it back with one click**, so that **a wide graph or document is not cut off**.
- **AC5.1.1** Given a view with a list column (Intents, Features and the others), when I press the toggle at the list's edge, then the list folds to a narrow strip and the main view takes the width. (FR5.1)
- **AC5.1.2** Given a folded list with a search, filter, sort and selection set, when I press the toggle or the strip, then the list returns with all four unchanged. (FR5.2)
- **AC5.1.3** Given I folded the Intents list, when the app restarts, then the Intents list is folded in every project, and the other views keep their own state. (FR5.3)
- **AC5.1.4** Given keyboard focus on the toggle, when I press Enter or Space, then it folds or opens, and `aria-expanded` and the accessible name follow; with reduced motion there is no animation. (FR5.4)
- **Dependencies:** none. **INVEST:** small; one shared component.
