# EPIC-05: Workflow Control

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> The console should not only show AI-DLC work but make it easy to steer: pick up an intent that stopped, switch between pieces of work and answer what the workflow is waiting for, without remembering slash commands. The app still never writes AI-DLC files itself. Every action goes through Claude in the embedded terminal, so AI-DLC's own checks and records stay in charge.

**Stories:** US-0501, US-0502, US-0503, US-0504, US-0505, US-0506, US-0507, US-0508, US-0509

**Status (2026-11-16):** ✅ US-0501–US-0503, US-0505 and US-0506 released (v0.2.0–v0.2.5). ✅ US-0504 released in v0.2.7. ✅ US-0507 released in v0.2.8. 📋 US-0508 and US-0509 planned. Each story names its release.

---

## User Stories

**US-0501: Resume an in-flight intent with one click** ✅ Released in v0.2.0
- As a **developer using AI-DLC**, in order to **pick up work that stopped (closed terminal, crashed session, switched to other work) without remembering which slash commands to type**, I would like to **a "Resume" button on every in-flight intent that continues it in the Claude terminal**.
- **Epic:** EPIC-05
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] **Given** an intent with status `in-flight` in `intents.json`, **when** I look at it in the intent list or its detail view, **then** I see a "Fortsätt" button. Intents with status `complete` show no button.
  - [x] **Given** I click "Fortsätt" on the intent that is already active (`active-intent`), **when** the claude terminal tab is open, **then** `/aidlc` is typed into it for me to confirm with Enter, and the terminal panel is shown and focused.
  - [x] **Given** I click "Fortsätt" on an intent that is *not* active, **then** the app first types and submits `/aidlc intent <dirName>` and, after that command has finished, types `/aidlc` for me to confirm. This matches AI-DLC's rule that switching intent and continuing are two separate commands.
  - [x] **Given** the claude terminal is not running (not started, exited or crashed), **when** I click "Fortsätt", **then** a new claude session is started in the project root first, and the commands are typed when it is ready (at most 20 s, then an error).
  - [x] **Given** Claude is busy (a response is streaming or a question is waiting for an answer), **when** I click "Fortsätt", **then** nothing is typed into the middle of it. The app shows "Claude arbetar — vänta eller avbryt först" and leaves the terminal alone.
  - [x] The button shows where the work will pick up, read from `aidlc-state.md`. For example: "Fortsätt vid Code Generation (steg 3 av 7)".
  - [x] The app writes no AI-DLC files. Switching and resuming happen only through the commands typed into Claude, so AI-DLC's checks, approvals and audit trail apply as usual.
  - [x] Keyboard accessible (`data-testid="intent-resume"`), with a status text that does not rely on colour alone.
- **Notes:** Decided in requirements analysis (Q1: C): each terminal tab shows an idle/busy/exited signal from the pty output (idle after 1.5 s without output). Only the intent switch is submitted automatically; `/aidlc` itself waits for the person's Enter.
- **Dependencies:** US-0102, US-0103, US-0108

**US-0502: Refresh — bring in new AI-DLC work from GitHub, even with work in progress** ✅ Released in v0.2.0
- As a **developer who runs AI-DLC on more than one machine or with teammates**, in order to **see and continue work that was pushed to GitHub (new intents, audit entries and stage artifacts from another machine or person)**, I would like to **a "Refresh" that shows what is new on the remote and lets me bring it in safely, also when I have unfinished local work**.
- **Epic:** EPIC-05
- **Priority:** High
- **Complexity:** High
- **Background:** AI-DLC is designed for this. Records under `aidlc/` are committed, every machine writes its own audit shard (one file per host and clone), and machine-local state (`runtime-graph.json`, `.aidlc-engine/`, `.aidlc-sessions/`, `active-intent`) is git-ignored. Conflicts should therefore be rare and limited to shared files such as `intents.json` and `aidlc-state.md`.
- **Proposed approach (three steps, each safe on its own):**
  1. **See:** `git fetch` when the person presses "Uppdatera". Only `.git/` is touched, never the working tree or AI-DLC files.
  2. **Look before you take:** remote intents and changes are read with `git show <remote>/<branch>:aidlc/...`, without touching the working tree.
  3. **Bring in:** an explicit action that runs in the terminal panel, so the person sees exactly what happens.
- **Acceptance Criteria:**
  - [x] **Detect:** the app runs `git fetch` for the open project only when the person presses "Uppdatera" in the GitHub panel, with fixed arguments and no shell. It shows a badge "N nya ändringar i AI-DLC på `origin/<branch>`" when the upstream of the current branch, or `origin/main`, has commits that touch `aidlc/`, plus one line with the number of changed files outside `aidlc/`.
  - [x] **Preview without changing anything:** a "Visa" view lists what is new under `aidlc/` on the remote:
    - new intents, read from the remote's `intents.json`
    - new or changed stages and artifacts
    - the number of new audit lines
    Remote-only intents are listed in the "Visa" view with a "på GitHub" marker, and files under `aidlc/` on the remote can be opened read-only straight from git objects (`git show`).
  - [x] **Status of local work:** before anything is brought in, the app shows the current branch, whether it is behind or ahead, uncommitted changes (split into `aidlc/` and other files) and whether an AI-DLC workflow is running right now. Running means Claude is busy in the terminal, or AI-DLC wrote under the intents folder (`active-directive.json` included) within the last 5 minutes.
  - [x] **Bring in (safe path):** "Hämta in" asks how to bring the changes in, Rebase (`git pull --rebase --autostash`) or Merge (`git pull --no-rebase --autostash`), with one sentence about each, and types the chosen command into the shell tab for the person to see and confirm with Enter. It is never sent automatically.
    - On a branch other than `main`, the app also offers "Uppdatera från main" with the same choice: `git fetch && git rebase origin/main` or `git fetch && git merge origin/main`, so the work in progress stays on its branch.
  - [x] **Never during a running workflow:** if an AI-DLC workflow is running, the action is disabled and the app says "Vänta tills AI-DLC-steget är klart eller parkera arbetet först". AI-DLC's engine files must not change under a running stage.
  - [x] **Conflicts:** "Visa konflikter" lists the conflicting files. For `intents.json` and `aidlc-state.md` it gives short guidance (keep both sides' rows, or ask Claude in the terminal to resolve it), and it offers `git rebase --abort` / `git merge --abort` to type into the shell tab. The app itself never resolves or discards anything.
  - [x] **Afterwards:** when the working tree changes, the file watcher reloads the views (as in US-0107). After the next "Uppdatera", the badge says there is nothing new.
  - [x] **Safety:** the app's own process only runs `git fetch`, `git rev-parse`, `git rev-list`, `git diff`, `git status --porcelain` and `git show`. All are read-only towards the working tree, take fixed arguments, have a timeout (10 s, `git fetch` 30 s) and never use a shell. Every command that changes the working tree is typed into the visible terminal for the person to run. The app still never writes AI-DLC files itself.
- **Decisions (requirements analysis, 2026-11-13):**
  - Fetching happens only when the person presses "Uppdatera"; there is no automatic fetch (Q3: C).
  - Rebase or Merge is chosen each time, with one sentence about each (Q2: C).
  - AI-DLC framework updates (a newer `aidlc` release, updated `.claude/` files) are a separate story, US-0504 (Q4: A).
- **Dependencies:** US-0101, US-0102, US-0107, US-0108, US-0501

**US-0503: Set up AI-DLC in a folder that does not have it yet** ✅ Released in v0.2.0
- As a **developer opening a project that does not use AI-DLC yet**, in order to **start working with AI-DLC from the console without leaving it to install and configure things by hand**, I would like to **an "Initiera AI-DLC" action on the "not an AI-DLC project" screen that sets AI-DLC up in that folder and then starts the first piece of work**.
- **Epic:** EPIC-05
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Today the app only shows "the folder is not an AI-DLC project" (FR1.2 in EPIC-01). Setting up AI-DLC in a project is done with the `aidlc` CLI (`aidlc config --harness claude`). It needs a git repository, and Claude Code has to be restarted afterwards so that AI-DLC's hooks and `/aidlc` commands are loaded.
- **Acceptance Criteria:**
  - [x] **Given** I open a folder without `aidlc/spaces/`, **then** the screen shows "Initiera AI-DLC" alongside the explanation. Nothing is changed in the folder until I choose to.
  - [x] **Prerequisites shown before anything happens:**
    - whether `aidlc` is installed and its version (`aidlc --version`, run read-only with fixed arguments)
    - whether the folder is a git repository
    - whether the folder already has another harness (`.kiro/`, `.codex/`, `.cursor/`, `.aidlc/`)

    If `aidlc` is missing, the app links to the installation instructions and stops there. If git is missing, it offers `git init -b main` as a first step.
  - [x] **Preview:** the app shows what will be created, from `aidlc config --harness claude --dry-run` (for example "create=360 update=0 conflict=0"). If there are conflicts with existing files, they are listed and setup is not offered until the person decides.
  - [x] **Run it visibly:** "Initiera" types `aidlc config --harness claude --yes` (preceded by `git init -b main` when needed) into the shell tab for the person to confirm with Enter. The app itself never writes the AI-DLC files. Setup runs through the official CLI, just as when done by hand.
  - [x] **Afterwards:**
    - When the first space appears under `aidlc/spaces/`, the tab switches from the "not AI-DLC" screen to the normal project view automatically (via a small file watcher that runs for folders without AI-DLC).
    - The claude terminal tab is restarted so that AI-DLC's hooks are loaded, and the app says so ("Claude startas om så att AI-DLC laddas").
    - The app offers "Kör /aidlc --doctor" and "Starta första arbetet", which types `/aidlc ` into the claude tab and lets the person describe what to build.
  - [x] **Errors:** if setup fails, the terminal output stays visible, the app says in one sentence what failed, and it suggests `aidlc doctor`. Nothing is rolled back or deleted by the app.
  - [x] **Safety:** the only commands the app runs itself are the read-only checks (`aidlc --version`, `aidlc config --dry-run`, `aidlc config project --show --json`, `git rev-parse`), with fixed arguments and no shell. Everything that changes the folder is typed into the visible terminal for the person to run.
  - [x] **Advanced settings (decided 2026-11-13):** a collapsed "Avancerade inställningar" section in the setup dialog lets the person choose:
    - **Plugins:** the installed plugins, from `aidlc config project --show --json`, chosen with checkboxes. Applied with `aidlc config project --plugins <names> --yes`.
    - **Model level:** the presets `thorough`, `balanced` or `minimal`, from `aidlc config models`, with a one-line description of each. Applied with `aidlc config models --preset <preset> --project --yes`.

    The section is collapsed by default, and **the defaults are AI-DLC's standard settings**: no extra plugins and no model preset (shipped defaults). If the person changes nothing, only `aidlc config --harness claude --yes` runs. Every chosen setting is added as its own command after setup, joined with `&&`, so the person sees the whole chain before pressing Enter.
- **Dependencies:** US-0101, US-0107, US-0108

**US-0504: Update the AI-DLC framework from the console** ✅ Released in v0.2.7
- As a **developer using AI-DLC**, in order to **keep the framework in my project current without remembering the CLI commands**, I would like to **see when a newer `aidlc` release or changed `.claude/` files are available, and get the update command typed into the terminal**.
- **Epic:** EPIC-05
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Split out of US-0502 in requirements analysis (Q4: A). Refreshing the work under `aidlc/` and updating the installation under `.claude/` are different things: the second changes the framework itself.
- **Acceptance Criteria:**
  - [x] The app shows the installed `aidlc` version and whether a newer release is available, read with fixed arguments and no shell.
  - [x] The app shows which `.claude/` files an update would change, from a dry run, before anything happens.
  - [x] "Uppdatera ramverket" types `aidlc update` or `aidlc config` into the shell tab for the person to confirm with Enter. The app never writes `.claude/` files itself.
  - [x] Disabled while an AI-DLC workflow is running, as in US-0502.
- **Dependencies:** US-0502, US-0503

**US-0505: Get Claude's questions as a popup** ✅ Released in v0.2.1
- As a **developer who lets AI-DLC run while I do something else**, in order to **not leave Claude waiting on a question I have not seen**, I would like to **see each AI-DLC question or approval as a popup in the app, and as a notification when the app is in the background**.
- **Epic:** EPIC-05
- **Priority:** High
- **Complexity:** Medium
- **Background:** AI-DLC writes every question to the audit log before it is shown: `DECISION_RECORDED` (with `Decision`, `Options`, `Question Id`, `Stage`), and `STAGE_AWAITING_APPROVAL` for approval gates. The answer comes later as `QUESTION_ANSWERED`, or as the stage's approval or rejection. The app already watches the audit log (EPIC-03), so it can tell a waiting question from an answered one without writing anything.
- **Acceptance Criteria:**
  - [x] **Detection:** a question is *waiting* when its `DECISION_RECORDED` (or `STAGE_AWAITING_APPROVAL`) has no later answer, approval, rejection or skip for the same question id or stage. Only intents in flight count. Questions older than the app's start are shown once in a list, not as popups.
  - [x] **Popup in the LCARS style** in the centre of the window, over everything else, like the settings dialog (decided in requirements analysis). It shows the project, the intent, the stage, the question and its options, with the full text readable. With several waiting questions the newest is first, with "1 of N". It closes with `Esc`.
  - [x] **Escalation:** if the question is still unanswered after 20 seconds, the popup's header and title turn glowing red (following the Animationer setting).
  - [x] **"Svara i Claude"** switches to that project and its Claude tab and focuses the terminal. The popup closes by itself as soon as the answer is in the audit log.
  - [x] **System notification** (Electron `Notification`) when the window is not focused or another project is active: "<project>: Claude väntar på ditt svar" with the question. Clicking it brings the app forward with the popup. It is shown once per question.
  - [x] **Settings:** "Ljud vid notis: På / Av" (default På), and "Frågor från Claude: Popup och notis / Bara popup / Av" in the app settings (later the settings view, US-0405), saved in the app's own `settings.json`. The default is Popup och notis.
  - [x] **Read-only:** the app writes no AI-DLC or project files and sends nothing to the terminal in this story. Question text from the audit log is shown as text, never as HTML.
  - [ ] **Not covered:** free-text questions Claude asks in the chat, and Claude Code's own permission prompts. They are not in the audit log. They would need Claude Code's `Notification` hook, which is set in Claude's settings and is a separate choice (a later story).
  - [x] **Later (not in this story):** answering straight from the popup by typing the chosen option into the Claude tab. Done in a UI hotfix with US-0901 (PR #18), released in v0.2.2. Claude Code gets the option's digit, a gate gets 1 or 2, and the own-answer field types the text and presses Enter. opencode gets the own-answer field only, until its picker keys are checked.
- **Dependencies:** US-0101 (watcher), EPIC-03 (audit parsing), US-0501 (Claude tab states), US-0402 (coral pulse)

**US-0506: Answer Claude Code's and opencode's own questions in a dialog, and see their messages** ✅ Released in v0.2.5 (intent `261114-agent-dialogs`, classic)
- As a **developer running an agent in the console while I do other things**, in order to **not miss anything the agent asks or tells me, AI-DLC or not**, I would like to **get every question and permission prompt from Claude Code or opencode as a dialog I can answer in, and see the agent's messages without opening the terminal**.
- **Epic:** EPIC-05
- **Priority:** High
- **Complexity:** High
- **Background:** US-0505 only sees AI-DLC's questions, because they are in the audit log. Claude Code's own questions (its question picker, permission prompts such as "Allow this command?") and its plain chat replies are not. Claude Code exposes them through hooks (`Notification` when it waits for input or permission, `Stop` when it finishes a reply, with the transcript path). opencode has its own plugin and event API. Reading the terminal output is the fallback.
- **Acceptance Criteria:**
  - [x] **Questions and permission prompts** from Claude Code and opencode, not just AI-DLC's, open the same dialog. It shows the question, its options and the project, and you can answer in place: pick an option, approve or deny a permission, or type your own answer. The dialog never answers on its own.
  - [x] **Messages:** a side panel or a "latest message" line shows the agent's last reply per project, rendered as Markdown, with a notification when the app is in the background. The full history stays in the terminal.
  - [x] **Source per harness:**
    - Claude Code: through its hooks.
    - opencode: through its event API or plugin.
    - Both are installed only after the person agrees, and the app shows what will be added to the harness settings first.
    - Without them, the app falls back to what it can read from the terminal and says so.
  - [x] **Escalation and settings** work as in US-0505 (calm, then red; popup and notification, popup only, or off), with a separate on/off setting for messages.
  - [x] **Safety:** permission answers go only to the tab that asked. Nothing is approved automatically. Text is shown as text, never as HTML.
- **Notes:** Added 2026-11-14 at the person's request ("answer questions from Claude or opencode in dialogs, not only from AI-DLC, and see messages from them").
- **Dependencies:** US-0505, US-0801, US-0803

**US-0507: See what the agents are doing and how far they have come** ✅ Released in v0.2.8
- As a **developer running AI-DLC**, in order to **know what is actually going on while subagents work in the background**, I would like to **plain progress lines per running agent, such as "u2-permissions has 6 of 27 steps done and u3-replies has 16 of 42"**.
- **Epic:** EPIC-05
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] It is shown as a section of the existing token detail view (`TokenDetail.jsx`, opened from the small token chart); no new view is added. The section is always there and says so in one sentence when nothing runs.
  - [x] Each running piece of agent work (a Unit's build, a build with no Unit, a reviewer, a design builder) gets a row with its Unit or stage and how long it has run.
  - [x] A build shows steps done out of the plan's steps, read from the ticked boxes in its `code-generation-plan.md` (in the Unit's worktree, or in the record when there is no Unit), plus its last commit subject.
  - [x] A review shows "review requested", then the verdict and how many findings by severity, from the review records.
  - [x] One summary line at the top of the section sums it up in words, for example "The builds are moving along: u2-permissions has 6 of 27 steps done and u3-replies has 16 of 42."
  - [x] It updates live as files and the audit log change; finished work shows its result for about a minute, then drops off; a worktree or plan that cannot be read is named, not shown as 0.
  - [x] Every text goes through `t()` in Swedish and English; numbers are computed from the records, never typed in.
- **Notes:** Added 2026-11-14 at the person's request. Decided 2026-11-16: it goes into the token detail view, not a view of its own.
- **Dependencies:** US-0104, US-0506

**US-0508: Rename an intent** 📋 Planned, for v0.3.0
- As a **developer with many intents**, in order to **find the right one by a name that says what it is**, I would like to **rename an intent from the app**.
- **Epic:** EPIC-05
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-15: "I wonder if we can add a story about renaming intents? I think this could be a good addition."
- **Acceptance Criteria:**
  - [ ] An intent in the list or its detail can be given a new name, checked like a slug (no spaces, no path characters, unique in the space).
  - [ ] The rename goes through AI-DLC's own command when it has one; the app never edits engine-owned files itself.
  - [ ] Story links, the cost history and an open intent's view follow the new name; nothing points at the old one.
  - [ ] An intent whose work is running cannot be renamed, and the app says why.
  - [ ] Every text goes through `t()` in Swedish and English.
- **Notes:** `aidlc engine orchestrate help` (aidlc 2.11.3) lists `intent switch`, `archive` and `unarchive`, but no rename. Find out whether AI-DLC offers one, or whether a display name kept beside the slug is enough.
- **Dependencies:** US-0501

**US-0509: Change the plan of an intent that has started** 📋 Planned, for v0.3.0
- As a **developer whose work turned out bigger or smaller than planned**, in order to **keep the right amount of process without starting over**, I would like to **change the plan AI-DLC follows for a running intent**.
- **Epic:** EPIC-05
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-15: "is it possible to change what plan AI-DLC is using on a intent even though it has started. that might also prove useful."
- **Acceptance Criteria:**
  - [ ] An intent's detail offers "Change plan". It shows the current plan and the stages already done, which stay done.
  - [ ] The choice is a ready-made plan, or a plan tailored to a description. Both go through AI-DLC (`/aidlc compose "<task>"` mid-workflow, or the scope switch), typed into the agent tab for the person to send, as with Resume.
  - [ ] AI-DLC's own approval of the new plan stays with the person in the agent tab; the app only shows the result.
  - [ ] The pipeline shows the new stages once AI-DLC has recorded them.
  - [ ] Every text goes through `t()` in Swedish and English.
- **Notes:** AI-DLC 2.11.3 has `compose "<task>"`, which suggests a plan for the stages not yet run and stops at an approve/edit/reject gate.
- **Dependencies:** US-0501, US-0901
