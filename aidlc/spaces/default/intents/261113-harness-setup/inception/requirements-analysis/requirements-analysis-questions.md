# Requirements Analysis Questions: US-0802 Set up AI-DLC for another harness

The story's acceptance criteria are in `docs/features/epic-08-harnesses.md`. US-0801 built the harness table and the detection, and setup (`src/main/setup.js`) still has `--harness claude` built in. These are the open points.

## Q1. [Product owner] Which harnesses the setup dialog offers

The agent tab can only run Claude Code and opencode (US-0801). AI-DLC itself can install six harnesses into a project.

A. All six AI-DLC supports (Claude Code, opencode, Codex, Kiro, Cursor, Copilot). Only Claude Code and opencode can then be chosen for the agent tab
B. Only Claude Code and opencode, the ones the agent tab can run
X. Other (please specify)

[Answer]: A (All six) **Mode:** guided

## Q2. [Product owner] How the setup command runs

Today setup is typed into the visible shell tab, and the person presses Enter. You decided earlier that the app may run the `aidlc` CLI itself for configuration changes (EPIC-09). Setup installs many files into the project.

A. Keep it visible: preview with `--dry-run` in the dialog, then type the command into the shell tab for the person to press Enter (as today)
B. The app runs it itself after the preview, with an Apply button, and shows the output in the dialog
X. Other (please specify)

[Answer]: B (App runs it) **Mode:** guided
