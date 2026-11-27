# Requirements: US-0806 custom agent command per project

## Intent analysis

AI-DLC setup installs six harnesses, but the agent tab only starts `claude` or `opencode`. The person wants to work in the app with whichever harness a project is set up for, by giving each project its own agent command. Type: enhancement of EPIC-08 (US-0801, US-0803). Scope: shared harness table, pty start in main, project settings, agent tab UI. [desc]

## Functional requirements

**FR1 Command per harness and project**
- FR1.1 Every harness in `HARNESSES` (Claude Code, opencode, Codex, Kiro, Cursor, Copilot) has an agent command the person can change per project in the project's terminal settings. [Q1]
- FR1.2 The field is prefilled with the harness's usual command: `claude`, `opencode`, `codex`, `kiro-cli`, `cursor-agent`, `copilot`. Clearing it returns to that default. [desc] [Q6]
- FR1.3 The command is saved per project in the app's own `settings.json` (never in the project) and is kept after a restart. [desc]
- FR1.4 All six harnesses can be chosen for the agent tab, and a project may show a custom-command tab side by side with other agent tabs (US-0803). [desc] [Q3]

**FR2 Starting the tab**
- FR2.1 Given a saved command, when a new agent tab opens in that project, then it runs that command through the login shell (`-l -i -c`) in the project folder. A tab already running keeps its command until it is restarted. [desc]
- FR2.2 When no command is saved, the table CLI starts as today, with the chosen tool path (US-0405 FR2.4) still applied.
- FR2.3 The tab is named after its harness, as today.

**FR3 What the command may contain**
- FR3.1 A command is a program followed by arguments separated by spaces. Allowed characters: letters, digits, space and `- _ . / = : @ , + ~`. [Q4]
- FR3.2 Anything else (`;`, `|`, `&`, `$`, backticks, `<`, `>`, quotes, line breaks, control characters), an empty command after trimming, or more than 500 characters is refused when saving, with a message naming the problem; nothing is saved. [Q4]
- FR3.3 Main checks the command again before spawning; a refused command never reaches the shell.

**FR4 Command not found**
- FR4.1 Given a command, before the tab starts, main runs `command -v <first word>` in the login shell. When it is missing, nothing is started. [Q5]
- FR4.2 The tab then says in one sentence that the command was not found and offers to open the project's terminal settings. [desc]

**FR5 Features that need Claude Code or opencode**
- FR5.1 A Claude Code or opencode tab with a changed command is still that harness: Fortsätt, resume, the agent dialog, the question popup and cost per session keep working. [Q7]
- FR5.2 In a Codex, Kiro, Cursor or Copilot tab the app sends no AI-DLC command: Fortsätt, the quick commands and the setup offers are shown as not available, with a short reason. [Q2]
- FR5.3 Resume, the agent dialog and cost per session say they are not available for that tab instead of failing. [desc]

**FR6 Texts**
- FR6.1 Every new text goes through `t()`, with the same keys in `sv.json` and `en.json`. [desc]
- FR6.2 The new settings field and messages follow the LCARS interface.

## Non-functional requirements

- NFR1 Security: the renderer sends command text only through the settings call, which validates it (FR3); the pty start reads the saved command in main, never a command from the tab.
- NFR2 Tests first (TDD) for validation, start, not-found and feature gating; line coverage stays at or above 80%.
- NFR3 The not-found check adds no more than one login-shell run per tab start.

## Constraints

- Electron app; node-pty; shared table in `src/shared/harnesses.js`; settings in `src/main/settings.js`; start in `src/main/pty.js`.
- Ships in v0.3.2 through its own squash-merged pull request (`feat/US-0806`).

## Assumptions

- A Codex, Kiro, Cursor or Copilot tab uses the shared 1.5 s quiet rule for Ledig/Arbetar, as no timing has been measured for them.
- A path with spaces or quotes cannot be typed as a command (FR3.1); the existing tool-path setting covers that for Claude Code and opencode.
- If a person sets Claude Code's command to another program, the app still treats the tab as Claude Code (FR5.1); that is their choice.
- "Terminal settings" is the project's section in Configuration where the harness choice already lives.

## Out of scope

- AI-DLC commands, resume or cost tracking for Codex, Kiro, Cursor or Copilot.
- Commands that are not a harness (a free "custom" entry with no harness).
- Measured ready timing for the four new harnesses.

## Open questions

None.
