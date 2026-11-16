# EPIC-08: Harnesses — not just Claude

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> AI-DLC runs on several AI coding tools ("harnesses"): Claude Code, opencode, Codex CLI, Kiro CLI, Cursor and GitHub Copilot. Each keeps its own engine folder (`.claude/`, `.aidlc/` for opencode, `.codex/`, `.kiro/`, `.cursor/`) beside the shared `aidlc/` workspace. The console is built around Claude today: the terminal tab runs `claude`, and setup runs `aidlc config --harness claude`. This epic lets the person choose another harness, for example opencode, per project, while the dashboard itself keeps working the same, since it reads the shared `aidlc/` records.

**Stories:** US-0801, US-0802, US-0803, US-0804, US-0805, US-0806

**Status (2026-11-15):** ✅ US-0801–US-0803 released (v0.2.1–v0.2.3). 📋 US-0804–US-0806 planned. Each story names its release.

---

## User Stories

**US-0801: Choose the harness per project (for example opencode instead of Claude)** ✅ Released in v0.2.1
- As a **developer who uses opencode (or Codex, Kiro) instead of Claude Code**, in order to **drive AI-DLC from the console with the tool I actually use**, I would like to **choose which harness the agent terminal runs for each project**.
- **Epic:** EPIC-08
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] **Detection:** when a project opens, the app sees which harnesses are installed in it (`.claude/`, `.aidlc/` for opencode, `.codex/`, `.kiro/`, `.cursor/`, `.github/` with AI-DLC files) and which CLIs are on the PATH (`claude`, `opencode`, `codex`, `kiro-cli`, each version read with `--version`, fixed arguments, no shell).
  - [x] **Choice per project** in Projektinställningar (and later in the settings view, US-0405): "Agent-terminal: Claude Code / opencode / Codex / Kiro". The default is the only installed harness, or Claude Code when there are several. Saved in the app's own `settings.json`, never in the project.
  - [x] **The agent tab** is named after the chosen harness ("opencode" instead of "claude"), starts that CLI in the project root through the login shell, and has the same states (Ledig / Arbetar / Avslutad, US-0501).
  - [x] **Commands follow the harness:** Fortsätt (US-0501), the quick commands and the setup offers use the harness's own way of running AI-DLC, from one table per harness (for example `/aidlc` in Claude Code and opencode, the skill or prompt form in Codex and Kiro). No command is ever sent to a harness that does not have it.
  - [x] **Warnings, no surprises:** if the chosen harness is not installed in the project or its CLI is not found, the tab says so in one sentence and offers to set it up (US-0802) or to choose another. Nothing is started.
  - [x] **The dashboard is unchanged:** intents, pipeline, timeline, cost and features keep reading the shared `aidlc/` records, whichever harness wrote them. Where a figure is harness-specific (for example the cost ledger, which today is filled by the Claude hooks), the view says which harness it covers.
  - [x] A project can have several harnesses installed. Switching is instant, and the old tab is closed only after the person confirms if it is working.
- **Notes:** Built for Claude Code and opencode; Codex, Kiro, Cursor and Copilot are detected and listed as "not supported yet" (decided in requirements). opencode waits 4 s of quiet output before the app types into it (measured on opencode v2.1.4).
- **Dependencies:** US-0501, US-0503, EPIC-06 (Projektinställningar)

**US-0802: Set up AI-DLC for another harness** ✅ Released in v0.2.1
- As a **developer starting AI-DLC in a project with opencode (or another harness)**, in order to **get the right engine files without running the CLI by hand**, I would like to **choose the harness in the setup dialog and add more harnesses to a project later**.
- **Epic:** EPIC-08
- **Priority:** Medium
- **Complexity:** Low
- **Acceptance Criteria:**
  - [x] The setup dialog (US-0503) gets "Harness: Claude Code / opencode / Codex / Kiro / Cursor / Copilot". The default is the one whose CLI is found, or Claude Code. The preview runs `aidlc --project-dir . config --harness <harness> --dry-run`; **Apply** then runs `… --yes` from the app itself and shows the result (changed 2026-11-14: the app runs setup instead of typing it into the shell tab).
  - [x] **Adding a harness** to a project that already uses AI-DLC, from Projektinställningar: "Lägg till harness…" shows the preview for the chosen harness and applies it. Existing harnesses and the `aidlc/` records are untouched; the app refuses to apply a preview that would remove anything or has conflicts.
  - [x] After setup, the new harness can be chosen for the agent tab (US-0801), and the app offers to switch the tab to it.
  - [x] The app writes no AI-DLC files itself. Everything goes through the official `aidlc` CLI, run by the app with fixed arguments (no shell).
- **Notes:** All six harness ids were checked against aidlc 2.11.3 with `--dry-run`. Codex, Kiro, Cursor and Copilot install AI-DLC's files but can't run in the agent tab yet.
- **Dependencies:** US-0503, US-0801

**US-0803: Use Claude Code and opencode side by side in the same project** ✅ Released in v0.2.3 (intent `261114-intent-0-2-3-release`)
- As a **developer who uses both Claude Code and opencode**, in order to **pick the tool that fits each task without switching the project over**, I would like to **have an agent tab for each installed harness in the same project, both running at once**.
- **Epic:** EPIC-08
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] A project with both harnesses installed shows one agent tab per selectable harness ("Claude", "opencode") beside the shell tab. Each runs its own CLI in the project root, with its own states (Ledig / Arbetar / Avslutad) and Restart.
  - [x] Which harness tabs are open is chosen per project in Projektinställningar (one or both), saved in the app's own `settings.json`. The single-harness choice from US-0801 stays the default for projects with one harness.
  - [x] Fortsätt, the quick commands, "Answer in …" and the setup offers go to a named tab. When both are open they go to the last one used, and the button names the tab ("Fortsätt i opencode").
  - [x] Busy checks (for example the refresh panel and EPIC-09's block on changing the active work's settings) count a project as busy when any of its agent tabs is "Arbetar".
  - [x] Both tabs work on the shared `aidlc/` records. When both are busy on the same active intent, the app warns once, in one sentence, that two agents are changing the same work.
- **Notes:** Added 2026-11-14 at the person's request ("I see no reason why not"). Today the agent tab is a single `agent` session whose harness can be switched (US-0801).
- **Dependencies:** US-0801, US-0802

**US-0804: See whether each tool is signed in, and sign in from the app** 📋 Planned, for v0.2.9
- As a **developer setting up a project**, in order to **avoid an agent tab or a GitHub feature failing on a missing sign-in**, I would like to **see whether Claude Code, opencode and the GitHub CLI are signed in, and start the sign-in from the app**.
- **Epic:** EPIC-08
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-15: "we should try to detect if the user is logged in and authenticated with the installed tools and harnesses (if that is an option) Like Claude code, GH CLI and open code... and try to trigger the authentication from the interface."
- **Acceptance Criteria:**
  - [ ] Settings › Tools shows each tool's sign-in state next to its version: signed in (with the account where the tool shows one), not signed in, or unknown when the tool offers no way to check.
  - [ ] The state comes from each tool's own command, run without prompting (for example `gh auth status`). The app never reads token or credential files.
  - [ ] A tool that is not signed in offers "Sign in". It starts the tool's own sign-in in the Shell tab (for example `gh auth login`, or `/login` in a Claude Code agent tab), where the person finishes it; the app never handles a password or token.
  - [ ] The state refreshes after a sign-in and when Settings opens; a check that fails or hangs is named, not shown as signed in.
  - [ ] An agent tab or GitHub feature that fails on a missing sign-in points to this.
  - [ ] Every text goes through `t()` in Swedish and English.
- **Notes:** Find out first which tools can report their sign-in without starting it: `gh auth status` can; Claude Code and opencode need checking (a status command, or a harmless call that fails clearly when signed out).
- **Dependencies:** US-0410, US-0801

---

**US-0805: A health check on the start screen, with install commands for what is missing** 📋 Planned
- As a **new user opening the app for the first time**, in order to **get from install to a working project without guessing**, I would like to **see on the start screen whether the tools the app needs are found and signed in, with a command to copy for each one that is missing**.
- **Epic:** EPIC-08
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-15: "an interactive onboarding / health check screen: on the start screen, a quick environment diagnostic check (which aidlc, which claude, gh auth status) with actionable copy-paste install commands if a dependency is missing from the login shell PATH."
- **Acceptance Criteria:**
  - [ ] **Given** the start screen, **then** a health check lists the AI-DLC CLI, Claude Code, opencode and the GitHub CLI, each as found (with its version), not found, or not signed in, from the same check as Settings › Tools (US-0410) and, once built, the sign-in state (US-0804).
  - [ ] **Given** a tool that is not found on the login shell's PATH, **then** its row shows the install command for this platform, with a Copy button, and says what the tool is needed for. A tool that is optional (opencode, `gh`) says so and never blocks the rest.
  - [ ] **Given** the person installed a tool, **when** they choose Check again, **then** the list is checked once more without restarting the app.
  - [ ] When everything needed is found, the check folds down to one line ("Everything is ready") and stays out of the way.
  - [ ] The app only shows commands; it never runs an install itself.
  - [ ] Every text goes through `t()` in Swedish and English.
- **Notes:**
  - **Where.** The start screen (`docs/screenshots/splash.png`), `checkTools` and `TOOL_IDS` in `src/main/tools.js`. Install commands per platform are kept in one table, with a link to each tool's own install page.
  - Overlaps US-0804 (sign-in state): build the check once and show it in both places.
- **Dependencies:** US-0410, US-0804

---

**US-0806: Run any harness in the agent terminal with a custom command per project** 📋 Planned
- As a **developer who uses Codex, Kiro, Cursor or Copilot with AI-DLC**, in order to **work in the app with the harness the project is set up for**, I would like to **choose a custom command for the agent terminal in a project's terminal settings**.
- **Epic:** EPIC-08
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-15: setup supports six harnesses (Claude Code, opencode, Codex, Kiro, Cursor, GitHub Copilot), while the embedded agent terminal runs only `claude` and `opencode`. "Supporting custom CLI commands per project in the terminal settings would let users run any agent harness seamlessly."
- **Acceptance Criteria:**
  - [ ] **Given** a project's terminal settings, **when** I enter a command (for example `codex` or `kiro-cli chat`), **then** new agent tabs in that project start it in the project folder instead of `claude` or `opencode`.
  - [ ] The project's harness picker offers the other set-up harnesses with their usual command filled in (`codex`, `kiro-cli`, …), which I can change.
  - [ ] The command runs as given through the login shell, as the agent tab does today; it is saved per project and kept after a restart.
  - [ ] **Given** a command that is not found, **then** the tab says so and points to the terminal settings.
  - [ ] Features that need a Claude Code or opencode tab (resume, the agent dialog, cost per session) say they are not available for a custom command instead of failing.
  - [ ] Every text goes through `t()` in Swedish and English.
- **Notes:**
  - **Where.** `HARNESSES` in `src/shared/harnesses.js` (Codex and Kiro are `selectable: false` today), the agent tab start in main, the project settings.
- **Dependencies:** US-0801, US-0803
