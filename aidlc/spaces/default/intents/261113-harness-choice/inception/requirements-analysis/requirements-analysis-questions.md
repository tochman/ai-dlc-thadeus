# Requirements Analysis Questions: US-0801 Choose the harness per project

The story's acceptance criteria in `docs/features/epic-08-harnesses.md` and the code scan (`inception/reverse-engineering/developer-scan.md`) settle most of this. These are the open points.

## Q1. [Product owner] Which harnesses this story makes selectable

The story lists Claude Code, opencode, Codex and Kiro. You said earlier that we start with Claude Code and opencode. opencode v2.1.4 and Codex are installed on this machine; Kiro is not.

A. Claude Code and opencode now. Other harnesses found in a project are listed as "not supported yet" and can't be chosen; they come in a later story
B. All four (Claude Code, opencode, Codex, Kiro), each with its own command table
X. Other (please specify)

[Answer]: A (Claude Code and opencode now) **Mode:** guided

## Q2. [Developer] Internal name of the agent tab

Today the word `claude` is the agent tab's id, the command it runs, the menu action, a CSS class and part of test ids. With several harnesses, the tab label must show the chosen harness either way.

A. Rename the internal id to a neutral `agent` everywhere (tab id, menu action, CSS, test ids); the label shows the harness name
B. Keep `claude` as the internal id and only change the label and the command it starts (smaller change, misleading name)
X. Other (please specify)

[Answer]: A (Rename to agent) **Mode:** guided

## Q3. [Developer] Resume and quick commands in opencode's full-screen interface

The app types a command into the agent tab only after the tab has been quiet for 1.5 seconds. opencode is a full-screen program that may redraw all the time, so it might never look quiet, and Resume and the quick commands would then time out.

A. Check against the installed opencode during the build; if it never goes quiet, give opencode its own readiness rule (for example type after its prompt appears), and keep the tab's Ledig/Arbetar states as close as possible
B. For opencode, turn Resume and the quick commands off until this is checked in a later story
X. Other (please specify)

[Answer]: A (Check and adapt for opencode) **Mode:** guided
