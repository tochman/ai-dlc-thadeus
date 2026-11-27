# Requirements Analysis Questions — US-0418 Pulse

The story already settles the view's place, its two observers, the colours, privacy and the readouts. These questions cover what it leaves open.

## Q1. [Product] Which tools count as a read?

The story names Read, Write, Edit and MultiEdit. Agents also look at files with Grep and Glob (many files at once), and with shell commands such as `cat`, which only show up as a command line.

A. Only Read (and opencode's read): one file, one pulse
B. Read, plus every file a Grep or Glob call names in its own input (a path, not the matches it found)
C. B, plus file paths found in a shell command's text (best guess)
X. Other (please specify)

[Answer]: C

## Q2. [Product] What about files outside the project?

Agents often read files outside the project, for example under `~/.claude/` or a package in the home folder. Only project-relative paths are kept.

A. Drop them: Pulse shows only files in the project
B. Count them as one "Outside the project" mark with no path, so the activity still shows
X. Other (please specify)

[Answer]: B

## Q3. [Developer] Who gets a file change when several shell commands run at once?

The file observer credits a change to "the agent whose shell command was running". Two agents can run shell commands at the same time.

A. The agent whose command started last
B. Every agent whose command was running gets the pulse
C. "Unattributed" whenever more than one command was running
X. Other (please specify)

[Answer]: B

## Q4. [Developer] When is a file change "already shown" by the hook observer?

A Write or Edit hook event is followed shortly by the file observer's change event for the same file.

A. Same file within 2 seconds after the hook event: shown once
B. Same file within 5 seconds
C. Same file, same agent, until that tool call ends (needs the tool's end event)
X. Other (please specify)

[Answer]: C

## Q5. [Product] How much history does Pulse keep?

The readouts show "reads/writes/deletes over time" and "latest actions".

A. Only while the app is open, in memory, over the last 15 minutes
B. In memory since the app started; cleared on restart
C. Saved to disk per project so it survives a restart
X. Other (please specify)

[Answer]: A

## Q6. [Design] When does a file mark leave the ring?

Agents fade when they stop. Files could pile up over a long session.

A. A file fades after 10 minutes with no action on it
B. Files stay until the last agent stops, then fade with it
C. Files stay for the whole app session; past the limit they group by folder
X. Other (please specify)

[Answer]: A

## Q7. [Developer] Which coding tools feed Pulse?

The app's hook adapters cover Claude Code and opencode. The app also starts other tools (for example Codex or Kiro), which send no tool events today.

A. Claude Code and opencode; other tools show only file-observer pulses, as "Unattributed"
B. Claude Code only in this story; opencode follows in its own story
X. Other (please specify)

[Answer]: A
