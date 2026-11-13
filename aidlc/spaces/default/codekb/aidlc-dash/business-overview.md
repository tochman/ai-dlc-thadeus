# Business Overview: aidlc-dash (T.H.A.D.E.U.S.)

## Purpose

T.H.A.D.E.U.S. (*Transformative Human-AI Development Environment for Ubiquitous Systems*; tagline *AI-driven software development, under human direction.*) is an Electron desktop app for developers at Auctum Solutions AB who work with AI-DLC. The repo is still named `aidlc-dash`. The app shows the state of one or more AI-DLC projects as a "bridge console": intents and their pipeline of stages, a live timeline from the audit logs, the unit DAG, cost per intent and model, and the project's feature docs. Next to these views sits an embedded terminal with two tabs per project: the agent tab (today always `claude`) and a login `shell`.

The app is read-only towards AI-DLC files. Anything that changes something (`/aidlc` commands, `git pull`, AI-DLC setup) is typed into a visible terminal tab and runs only when the person presses Enter. The only file the app writes is its own `settings.json` in userData (folder `aidlc-dash`).

## Users

- Developers who drive AI-DLC from a coding agent and want to see what the agents do while they work. Today that agent is Claude Code. EPIC-08 opens this to opencode, Codex CLI and Kiro CLI.
- The console stays open all day, often on its own screen, so readability, contrast, calm motion and fullscreen matter (EPIC-04).
- People often have several projects open and work in other windows, so waiting questions show as a popup and a system notification (US-0505).
- Swedish and English speakers. Since US-0701 the interface follows the `language` setting (auto from the OS locale, or sv/en).

## Main functions (per epic in `docs/FEATURES.md`)

| Epic | Content | Status (from earlier scans and commits) |
|------|---------|--------|
| EPIC-01 | Base console: project tabs, intent list, detail view (Pipeline, Timeline, Units, Files), terminal, splash and Auctum mark, LCARS theme | Released v0.1.0 |
| EPIC-02 | Cost and models from `usage-ledger.json` and `aidlc config models` | Built |
| EPIC-03 | Virtualised timeline with precise live updates | Built |
| EPIC-04 | Icon and OS integration, glow and motion, LCARS design update, fullscreen and app menu, settings view (US-0405, planned), the name T.H.A.D.E.U.S. (US-0406) | US-0406 merged (commit `df21127`, PR #12) |
| EPIC-05 | Workflow control: Resume (Fortsätt), Update from GitHub, Set up AI-DLC, questions and approvals as popup and notification | Built |
| EPIC-06 | Feature docs: Features view, project settings (Projektinställningar) | Built |
| EPIC-07 | Internationalisation: US-0701 i18n foundation with Swedish and English | US-0701 committed on `feat/us0701-i18n` (commit `71fe927`) |
| EPIC-08 | Harnesses beyond Claude: US-0801 choose the harness per project, US-0802 set up AI-DLC for another harness | Planned; US-0801 is this intent |

## This intent: US-0801

Intent `261113-harness-choice` implements US-0801 (`docs/features/epic-08-harnesses.md`): the person chooses which harness the agent terminal runs for each project. The acceptance criteria ask for:

- **Detection** when a project opens: installed harness folders (`.claude/`, `.aidlc/` for opencode, `.codex/`, `.kiro/`, `.cursor/`, `.github/` with AI-DLC files) and CLIs on the PATH (`claude`, `opencode`, `codex`, `kiro-cli`), each version read with `--version`, fixed arguments, no shell.
- **A choice per project** in Projektinställningar: "Agent-terminal: Claude Code / opencode / Codex / Kiro". The default is the only installed harness, or Claude Code when several are installed. It is saved in the app's own `settings.json`, never in the project.
- **An agent tab named after the harness**, started in the project root through the login shell, with the same states (Idle / Working / Exited).
- **Commands that follow the harness**: Resume, the quick commands and the setup offers come from one table per harness. A command is never sent to a harness that does not have it.
- **A warning and nothing started** when the chosen harness is not installed in the project or its CLI is not found.
- **An unchanged dashboard**, reading the shared `aidlc/` records. Harness-specific figures (the cost ledger, filled today by the Claude hooks) say which harness they cover.
- **Instant switching**: the old tab is closed only after the person confirms, if it is working.

Where the code ties the console to Claude today is listed in `component-inventory.md` (PTY Manager, TerminalPanel, TerminalContext, ResumeButton, Setup Helper, Model Config Reader, Settings Store) and `code-quality-assessment.md` (Risks for US-0801).

## Business rules that shape the interface

- Status is never shown by colour alone: every tag has text (FR9.3, NFR3).
- Body text has at least 4.5:1 contrast against `--bg` and `--panel` (NFR3, WCAG AA).
- No Star Trek trademarks, logos, sounds or copied assets (FR9.5). The only logo is the Auctum mark.
- All costs are estimates and are labelled so (`cost.label`, "Estimated cost (API price)").
- Decorative numbers must not look like real data (US-0403).
- The app writes only its own `settings.json`. Commands that change a project are typed for the person to confirm with Enter (US-0503 FR4.4, US-0802).
- Every visible text comes from `src/shared/locales/{sv,en}.json` (US-0701). A missing key falls back to English, then to the key, never to an empty text.

Component details are in `component-inventory.md`, architecture in `architecture.md`.
