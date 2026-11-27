# Requirements Analysis Questions: US-0806 custom agent command

Today the agent tab only starts `claude` or `opencode`, taken from the fixed harness table (`src/shared/harnesses.js`); Codex, Kiro, Cursor and Copilot are `selectable: false`. These questions settle how a per-project custom command fits in.

## Q1. [Product owner] Which harnesses get an editable command?

The story says the picker offers the other set-up harnesses with their usual command filled in, which you can change. That leaves open whether Claude Code and opencode can be changed too.

A. Only Codex, Kiro, Cursor and Copilot get an editable command (prefilled); Claude Code and opencode keep their fixed command and the existing tool-path setting
B. Every harness, Claude Code and opencode included, gets an editable command per project
C. One free "Custom command" field only; picking a harness just fills it in
X. Other (please specify)

[Answer]: B

## Q2. [Product owner] AI-DLC buttons in a custom-command tab

Fortsätt, the quick commands and the setup offers type AI-DLC commands into the tab. Codex and Kiro run AI-DLC in their own way (a skill or prompt, not `/aidlc`), and that has not been checked in the agent tab.

A. Send nothing to a custom-command tab: those buttons say they are not available there
B. Add the Codex and Kiro AI-DLC commands to the table and send them like for Claude Code
X. Other (please specify)

[Answer]: A

## Q3. [Product owner] Side by side with other agent tabs

Since US-0803 a project can show a Claude Code and an opencode tab at once.

A. A custom-command harness is one more tab in that side-by-side list
B. Only one agent tab when a custom command is chosen
X. Other (please specify)

[Answer]: A

## Q4. [Developer] What the command may contain

The command is typed by the person and run through the login shell (`-l -i -c`), as the agent tab does today. Until now no command text ever came from the screen; only a checked harness id did.

A. Any single line the person types (arguments, pipes and so on allowed, since it is their own machine), with no line breaks or control characters and at most 500 characters
B. Only a program and its arguments: shell operators (`;`, `|`, `&`, `$`, backticks, redirects) are refused with a message
X. Other (please specify)

[Answer]: B

## Q5. [Developer] How "command not found" is detected

The story says a command that is not found is reported and points to the terminal settings.

A. Start it, and when the shell exits at once with code 127 ("command not found"), show the message in the tab (this also covers aliases and functions in the person's shell profile)
B. Check the first word with `command -v` in the login shell before starting, and start nothing when it is missing
X. Other (please specify)

[Answer]: B

## Q6. [Developer] Prefilled command for Cursor and Copilot

The table has no CLI for Cursor and Copilot. Their terminal agents are, as far as known, `cursor-agent` and `copilot`.

A. Prefill `cursor-agent` and `copilot`
B. Leave the field empty for those two; the person types the command
X. Other (please specify)

[Answer]: A

## Q7. [Product owner] A changed Claude Code or opencode command

Follows from Q1 (every harness editable). If a project changes Claude Code's command (for example to `claude --model opus`), the tab may still be Claude Code, or something else entirely.

A. It stays a Claude Code (or opencode) tab: Fortsätt, resume, the agent dialog and cost per session keep working; only the started command differs
B. Any changed command makes it a custom-command tab: those features say they are not available
X. Other (please specify)

[Answer]: A
