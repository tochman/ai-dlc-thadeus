# Requirements — US-0418 Pulse

## Intent analysis

The person watching agents work wants to see, at a glance and across the whole project, who is working and which files they read, write and delete. Pulse is a new app-level view on the left arm. It sits beside the Activity view, which stays per intent. Type: new feature, several parts (main-process observers, adapters, renderer canvas view). Complexity: Large. Depth: Standard. Release v0.3.3, as its first story.

Sources: the initial request (`[desc]`), the story US-0418 in `docs/features/epic-04-branding-and-desktop.md`, the release plan `docs/releases/0.3.3.md`, and the answers Q1 to Q7 in `requirements-analysis-questions.md`.

## Functional requirements

**FR1 — The Pulse view**
- FR1.1 A Pulse block on the left arm opens the view. A live dot on the block shows while any agent works. [desc]
- FR1.2 The view covers the whole project: every intent and every session. Sessions without an intent show as "Main" until EPIC-15 lands. [story]

**FR2 — Agents on the ring**
- FR2.1 The main chat and each dispatched agent of each running session hold a segment of the ring, grouped by intent or session. [story]
- FR2.2 A segment appears when its agent starts and fades when it stops. [story]
- FR2.3 One "Unattributed" segment holds file pulses no agent can be credited with (FR4.3, FR6.2). [story, Q7]

**FR3 — Hook observer**
- FR3.1 For Read, Write, Edit and MultiEdit (Claude Code) and their opencode matches, the adapter keeps the file path from the tool input. [story]
- FR3.2 Grep and Glob count as reads of the path in their own input (a file or folder), not of the matches they find. [Q1]
- FR3.3 A shell command's text is scanned for file paths, best guess, and each path found counts as a read. A change the file observer sees during that command is shown as the change, not as a read. [Q1]
- FR3.4 Each access draws a pulse from the agent to the file's mark, coloured by action: read steel, write white, delete coral (US-0417's colour rule). [story]

**FR4 — File observer**
- FR4.1 A chokidar watch sees files created, changed or deleted in the project, skipping `.git`, `node_modules` and git-ignored files. [story]
- FR4.2 It runs only while an agent runs or an intent or Spec Kit flow is active, and stops when none is. [story]
- FR4.3 A change is credited to every agent whose shell command was running at that moment; with none running, to "Unattributed". [Q3]
- FR4.4 A change to a file is not shown again when an agent's Write, Edit or MultiEdit call on that same file is still open (between its start and end hook events). [Q4]

**FR5 — Paths and privacy**
- FR5.1 Only project-relative paths are kept. No file content, prompt text or other tool input is kept. [story]
- FR5.2 A path outside the project is counted as one "Outside the project" mark, with no path kept. [Q2]
- FR5.3 A test feeds the agent-event fixtures through the adapters and asserts FR5.1 and FR5.2. [story]

**FR6 — Coding tools**
- FR6.1 Claude Code and opencode feed the hook observer. [Q7]
- FR6.2 Other tools the app starts (such as Codex or Kiro) show only file-observer pulses, credited to "Unattributed". [Q7]

**FR7 — Files on the ring**
- FR7.1 A file gets a mark on its first access and fades after 10 minutes with no action on it. [Q6]
- FR7.2 Past a set number of visible marks, files are grouped by folder. [story]

**FR8 — Interaction**
- FR8.1 Hovering a file or an agent shows its name and its last actions. [story]
- FR8.2 Clicking a file opens it in the editor (US-1001). The "Outside the project" mark and deleted files do not open. [story]

**FR9 — Readouts**
- FR9.1 Under the ring, small LCARS readouts show the latest actions, actions per agent, and reads, writes and deletes over time. [story]
- FR9.2 History is kept in memory only, for the last 15 minutes, while the app is open. [Q5]

## Non-functional requirements

- NFR1 Performance: with 20 agents and 500 files the view stays smooth (at least 30 frames per second on the release Mac). Drawn on a canvas. [story]
- NFR2 No new dependency (chokidar is already installed). [story]
- NFR3 Reduced motion: when the system asks for it, the view shows a still frame with no pulses moving. [story]
- NFR4 i18n: every text goes through `t()`, with the same keys in `sv.json` and `en.json`. [story]
- NFR5 Look: LCARS, in the app's own terms. No copy of pretty-events' look or code. [story]
- NFR6 Disk: the file observer is not running when FR4.2's conditions are not met; a test asserts it stops. [story]
- NFR7 Quality: TDD, 80% line coverage, ESLint and Prettier green (project rules).

## Constraints

- Builds on US-0214 and US-0030 (hook activity stream with agent ids) and US-0417 (action colours).
- The hook events `pretool` and `posttool` already exist in `src/main/agentHooks.js`; FR4.4 uses them.

## Assumptions

- A shell command's file paths are a best guess (FR3.3); missed or wrong paths are accepted. Reason: the person chose C in Q1.
- FR7.2's limit is set in Functional Design, sized to meet NFR1.

## Out of scope

- Replay of a past session (can follow US-1505).
- Free sessions as their own groups (EPIC-15).
- Hook events from tools other than Claude Code and opencode.
- History saved to disk.

## Open questions

None.
