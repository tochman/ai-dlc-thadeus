# EPIC-05: Workflow Control

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> The console should not only show AI-DLC work but make it easy to steer: pick up an intent that stopped, switch between pieces of work and answer what the workflow is waiting for, without remembering slash commands. The app still never writes AI-DLC files itself. Every action goes through Claude in the embedded terminal, so AI-DLC's own checks and records stay in charge.

**Stories:** US-0501, US-0502, US-0503

**Status (2026-11-13):** 📋 Planned.

---

## User Stories

**US-0501: Resume an in-flight intent with one click** 📋 Planned
- As a **developer using AI-DLC**, in order to **pick up work that stopped (closed terminal, crashed session, switched to other work) without remembering which slash commands to type**, I would like to **a "Resume" button on every in-flight intent that continues it in the Claude terminal**.
- **Epic:** EPIC-05
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] **Given** an intent with status `in-flight` in `intents.json`, **when** I look at it in the intent list or its detail view, **then** I see a "Fortsätt" button. Intents with status `complete` show no button.
  - [ ] **Given** I click "Fortsätt" on the intent that is already active (`active-intent`), **when** the claude terminal tab is open, **then** `/aidlc` is typed into it and submitted, and the terminal panel is shown and focused.
  - [ ] **Given** I click "Fortsätt" on an intent that is *not* active, **then** the app first types `/aidlc intent <dirName>` and, after that command has finished, `/aidlc`. This matches AI-DLC's rule that switching intent and continuing are two separate commands.
  - [ ] **Given** the claude terminal is not running (not started, exited or crashed), **when** I click "Fortsätt", **then** a new claude session is started in the project root first, and the commands are typed when it is ready.
  - [ ] **Given** Claude is busy (a response is streaming or a question is waiting for an answer), **when** I click "Fortsätt", **then** nothing is typed into the middle of it. The app shows "Claude arbetar — vänta eller avbryt först" and leaves the terminal alone.
  - [ ] The button shows where the work will pick up, read from `aidlc-state.md` or `runtime-graph.json`. For example: "Fortsätt vid Code Generation (steg 3 av 7)".
  - [ ] The app writes no AI-DLC files. Switching and resuming happen only through the commands typed into Claude, so AI-DLC's checks, approvals and audit trail apply as usual.
  - [ ] Keyboard accessible (`data-testid="intent-resume"`), with a status text that does not rely on colour alone.
- **Notes:** The command timing (wait until the switch command has finished before typing `/aidlc`) needs a reliable "Claude is idle" signal from the pty output, or a short confirmation step. This is settled during requirements analysis.
- **Dependencies:** US-0102, US-0103, US-0108

**US-0502: Refresh — bring in new AI-DLC work from GitHub, even with work in progress** 📋 Planned
- As a **developer who runs AI-DLC on more than one machine or with teammates**, in order to **see and continue work that was pushed to GitHub (new intents, audit entries and stage artifacts from another machine or person)**, I would like to **a "Refresh" that shows what is new on the remote and lets me bring it in safely, also when I have unfinished local work**.
- **Epic:** EPIC-05
- **Priority:** High
- **Complexity:** High
- **Background:** AI-DLC is designed for this. Records under `aidlc/` are committed, every machine writes its own audit shard (one file per host and clone), and machine-local state (`runtime-graph.json`, `.aidlc-engine/`, `.aidlc-sessions/`, `active-intent`) is git-ignored. Conflicts should therefore be rare and limited to shared files such as `intents.json` and `aidlc-state.md`.
- **Proposed approach (three steps, each safe on its own):**
  1. **See:** `git fetch` in the background. Only `.git/` is touched, never the working tree or AI-DLC files.
  2. **Look before you take:** remote intents and changes are read with `git show <remote>/<branch>:aidlc/...`, without touching the working tree.
  3. **Bring in:** an explicit action that runs in the terminal panel, so the person sees exactly what happens.
- **Acceptance Criteria:**
  - [ ] **Detect:** the app runs `git fetch` for the open project (on start, every N minutes and on a "Refresh" button), with fixed arguments and no shell. It shows a badge "N nya ändringar i AI-DLC på `origin/<branch>`" when the upstream of the current branch, or `origin/main`, has commits that touch `aidlc/`.
  - [ ] **Preview without changing anything:** a "Visa" view lists what is new under `aidlc/` on the remote:
    - new intents, read from the remote's `intents.json`
    - new or changed stages and artifacts
    - the number of new audit events
    Remote-only intents are shown in the intent list with a "på GitHub" marker and can be opened read-only straight from git objects (`git show`).
  - [ ] **Status of local work:** before anything is brought in, the app shows the current branch, whether it is behind or ahead, uncommitted changes (split into `aidlc/` and other files) and whether an AI-DLC workflow is running right now. Running means Claude is busy in the terminal, or `active-directive.json` was changed within the last minutes.
  - [ ] **Bring in (safe path):** "Hämta in" types a command into the shell tab for the person to see and confirm with Enter. It is never sent automatically.
    - On the same branch with only AI-DLC changes coming in: `git pull --rebase --autostash`.
    - On a feature branch, with work going on elsewhere, the app offers an alternative instead: "Uppdatera från main", which runs `git fetch && git merge origin/main` (or rebase, per a setting), so the work in progress stays on its branch.
  - [ ] **Never during a running workflow:** if an AI-DLC workflow is running, the action is disabled and the app says "Vänta tills AI-DLC-steget är klart eller parkera arbetet först". AI-DLC's engine files must not change under a running stage.
  - [ ] **Conflicts:** if git reports conflicts, the app lists the files. For known AI-DLC files it gives guidance: `intents.json` keeps both sides' rows, and audit shards never conflict since they are per machine. It also suggests asking Claude in the terminal to resolve them, or aborting with `git rebase --abort` / `git merge --abort`. The app itself never resolves or discards anything.
  - [ ] **Afterwards:** when the working tree changes, the file watcher reloads the views (as in US-0107). The badge disappears once nothing new is left.
  - [ ] **Safety:** the app's own process only runs `git fetch`, `git rev-list`, `git log`, `git diff --name-only` and `git show`. All are read-only towards the working tree, take fixed arguments and never use a shell. Every command that changes the working tree is typed into the visible terminal for the person to run. The app still never writes AI-DLC files itself.
- **Open questions (settle in requirements analysis):**
  - Should "Refresh" also cover **AI-DLC framework updates**, that is a newer `aidlc` release or updated `.claude/` files from `aidlc update` and `aidlc config`? If so, that is probably a separate story, since it changes the installation rather than the work.
  - Rebase or merge as the default for "Uppdatera från main"?
  - How often to fetch automatically, and should it be possible to turn off?
- **Dependencies:** US-0101, US-0102, US-0107, US-0108, US-0501

**US-0503: Set up AI-DLC in a folder that does not have it yet** 📋 Planned
- As a **developer opening a project that does not use AI-DLC yet**, in order to **start working with AI-DLC from the console without leaving it to install and configure things by hand**, I would like to **an "Initiera AI-DLC" action on the "not an AI-DLC project" screen that sets AI-DLC up in that folder and then starts the first piece of work**.
- **Epic:** EPIC-05
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Today the app only shows "the folder is not an AI-DLC project" (FR1.2 in EPIC-01). Setting up AI-DLC in a project is done with the `aidlc` CLI (`aidlc config --harness claude`). It needs a git repository, and Claude Code has to be restarted afterwards so that AI-DLC's hooks and `/aidlc` commands are loaded.
- **Acceptance Criteria:**
  - [ ] **Given** I open a folder without `aidlc/spaces/`, **then** the screen shows "Initiera AI-DLC" alongside the explanation. Nothing is changed in the folder until I choose to.
  - [ ] **Prerequisites shown before anything happens:**
    - whether `aidlc` is installed and its version (`aidlc --version`, run read-only with fixed arguments)
    - whether the folder is a git repository
    - whether the folder already has another harness (`.kiro/`, `.codex/`, `.cursor/`, `.aidlc/`)

    If `aidlc` is missing, the app links to the installation instructions and stops there. If git is missing, it offers `git init -b main` as a first step.
  - [ ] **Preview:** the app shows what will be created, from `aidlc config --harness claude --dry-run` (for example "create=360 update=0 conflict=0"). If there are conflicts with existing files, they are listed and setup is not offered until the person decides.
  - [ ] **Run it visibly:** "Initiera" types `aidlc config --harness claude --yes` (preceded by `git init -b main` when needed) into the shell tab for the person to confirm with Enter. The app itself never writes the AI-DLC files. Setup runs through the official CLI, just as when done by hand.
  - [ ] **Afterwards:**
    - When `aidlc/spaces/` appears, the tab switches from the "not AI-DLC" screen to the normal project view automatically (via the file watcher).
    - The claude terminal tab is restarted so that AI-DLC's hooks are loaded, and the app says so ("Claude startas om så att AI-DLC laddas").
    - The app offers "Kör /aidlc --doctor" and "Starta första arbetet", which types `/aidlc ` into the claude tab and lets the person describe what to build.
  - [ ] **Errors:** if setup fails, the terminal output stays visible, the app says in one sentence what failed, and it suggests `aidlc doctor`. Nothing is rolled back or deleted by the app.
  - [ ] **Safety:** the only commands the app runs itself are the read-only checks (`aidlc --version`, `aidlc config --dry-run`, `git rev-parse`), with fixed arguments and no shell. Everything that changes the folder is typed into the visible terminal for the person to run.
  - [ ] **Advanced settings (decided 2026-11-13):** a collapsed "Avancerade inställningar" section in the setup dialog lets the person choose:
    - **Plugins:** the installed plugins, from `aidlc config project --show --json`, chosen with checkboxes. Applied with `aidlc config project --plugins <names> --yes`.
    - **Model level:** the presets `thorough`, `balanced` or `minimal`, from `aidlc config models`, with a one-line description of each. Applied with `aidlc config models --preset <preset> --project --yes`.

    The section is collapsed by default, and **the defaults are AI-DLC's standard settings**: no extra plugins and no model preset (shipped defaults). If the person changes nothing, only `aidlc config --harness claude --yes` runs. Every chosen setting is added as its own visible command in the terminal after setup, and the person confirms each one with Enter.
- **Dependencies:** US-0101, US-0107, US-0108
