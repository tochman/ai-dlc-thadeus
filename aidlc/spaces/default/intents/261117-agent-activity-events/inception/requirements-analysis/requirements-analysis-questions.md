# Requirements Analysis Questions: US-0214

US-0214 (`docs/features/epic-02-cost-and-models.md`) is written in detail, with the hook events checked against both harnesses' docs. These questions cover only what it leaves open.

## Q1. [Product owner] Which diagrams get the legend toggles?

The story asks for click-to-hide on "Tokens over time". The token view has other diagrams with more than one series: the rate, and the splits by stage, agent and model.

A. Every diagram with more than one series (the story's proposal)
B. Only "Tokens over time"
X. Other (please specify)

[Answer]: A

## Q2. [Product owner] How detailed is a row's state?

Claude Code reports tool calls exactly. "Writing" comes from `MessageDisplay`, which may fire often. opencode also reports "thinking".

A. Show every state the harness reports: running a tool (with its name), writing, thinking (opencode only), waiting for me, idle, error
B. Fewer, steadier states: running a tool (with its name), working (writing or thinking), waiting for me, idle, error
X. Other (please specify)

[Answer]: A

## Q3. [Product owner] Does a row show only what it is doing now, or a short history too?

A. Only now, plus how long it has been in that state
B. Now, plus the last few tool calls (for example the last 5, with their names and durations)
X. Other (please specify)

[Answer]: A

## Q4. [Developer] Several agent tabs on the same project (for example Claude and opencode side by side)

Hook events carry a session id, not an intent. The app knows which agent tab a session runs in.

A. Each agent tab's main chat gets its own "Main" row, labelled with its harness; their dispatched agents sit under it
B. One "Main" row for the active agent tab only
X. Other (please specify)

[Answer]: A

## Q5. [Developer] A report-only hook on every tool call

Tool activity needs `PreToolUse` and `PostToolUse` for every tool, not only `AskUserQuestion`. Each call then starts a small script. It is `async`, so the agent never waits for it, but it costs roughly 10–20 ms of CPU per tool call.

A. Accept it: report every tool call
B. Report only `SubagentStart`/`SubagentStop`, `Stop` and the waiting events; no per-tool rows
X. Other (please specify)

[Answer]: A
