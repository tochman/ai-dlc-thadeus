# EPIC-08: Harnesses — not just Claude

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> AI-DLC runs on several AI coding tools ("harnesses"): Claude Code, opencode, Codex CLI, Kiro CLI, Cursor and GitHub Copilot. Each keeps its own engine folder (`.claude/`, `.aidlc/` for opencode, `.codex/`, `.kiro/`, `.cursor/`) beside the shared `aidlc/` workspace. The console is built around Claude today: the terminal tab runs `claude`, and setup runs `aidlc config --harness claude`. This epic lets the person choose another harness, for example opencode, per project, while the dashboard itself keeps working the same, since it reads the shared `aidlc/` records.

**Stories:** US-0801, US-0802

**Status (2026-11-14):** ✅ US-0801 and US-0802 done, merged to main (not released yet) (Claude Code and opencode selectable in the agent tab; all six harnesses can be set up from the app).

---

## User Stories

**US-0801: Choose the harness per project (for example opencode instead of Claude)** ✅ Done, merged to main (not released yet)
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

**US-0802: Set up AI-DLC for another harness** ✅ Done, merged to main (not released yet)
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
