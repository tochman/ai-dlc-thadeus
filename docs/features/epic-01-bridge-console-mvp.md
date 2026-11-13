# EPIC-01: Bridge Console MVP

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> An Electron desktop app that sits on top of an AI-DLC project and shows what the agents are doing: which intents exist, where each workflow is in its phases and stages, what happened when (audit log), how bolts/units depend on each other, and what each stage produced. It updates live while agents work, and embeds a terminal running `claude` in the project folder so the user can give commands and answer gate questions without leaving the app. The look is inspired by the LCARS interfaces of modern Star Trek (Picard, Discovery, Strange New Worlds): dark, rounded elbow panels, a restrained accent palette — but readability always wins over decoration.

**Stories:** US-0101, US-0102, US-0103, US-0104, US-0105, US-0106, US-0107, US-0108, US-0109, US-0110

**Status (2026-11-13):** Planned. To be built with AI-DLC in `express` scope.

---

## Data sources (AI-DLC 2.11.x on-disk format)

All paths are relative to the opened project root. The app **only reads** these files; it never writes to them.

| Source | What it holds |
|--------|---------------|
| `aidlc/active-space` | Name of the active space (e.g. `default`) |
| `aidlc/spaces/<space>/intents/intents.json` | Array of intents: `uuid`, `slug`, `dirName`, `scope`, `status` (`in-flight`, `complete`, …), `request` |
| `aidlc/spaces/<space>/intents/active-intent` | `dirName` of the active intent |
| `<intent>/runtime-graph.json` | `workflow_id`, `scope`, `started_at`, `stages[]` (`stage_slug`, `agent`, `started_at`, `completed_at`, `outcome`: `approved`/`pending`/…, `sensor_firings`), optional `bolt_dag` (`units[]` with `name`, `depends_on`, `kind`; `batches[][]`). Git-ignored: exists only locally |
| `<intent>/aidlc-state.md` | Project info, scope config, phase progress, stage checkboxes (`[ ]` not started, `[-]` in progress, `[?]` awaiting approval, `[R]` revising, `[x]` done, `[S]` skipped) with `EXECUTE`/`SKIP` |
| `<intent>/project-description.json` | The original request text (JSON string) |
| `<intent>/audit/*.md` | Event log: `## Title` blocks with `**Timestamp**:`, `**Event**:` (e.g. `STAGE_STARTED`, `STAGE_COMPLETED`, `SUBAGENT_DISPATCHED`, `SUBAGENT_COMPLETED`, `GATE_APPROVED`, `STAGE_AWAITING_APPROVAL`, `QUESTION_REPLIED`, `DECISION_RECORDED`, `UNIT_STARTED`, `UNIT_COMPLETED`, `ERROR_LOGGED`) and further `**Key**: value` fields, separated by `---` |
| `<intent>/<phase>/<stage>/*.md` | Stage artifacts (phases: `initialization`, `ideation`, `inception`, `construction`, `operation`, `verification`) |
| `<intent>/.aidlc-engine/active-directive.json` | Current engine directive: `kind`, `stage`, `delivery` |

Reference project with real data: `~/Projects/visinv` (20+ intents, `261110-epic02-finish` has a 6-unit bolt DAG).

---

## User Stories

**US-0101: Open an AI-DLC project** 📋 Planned
- As a **developer using AI-DLC**, in order to **look at any of my projects**, I would like to **pick a project folder and have the app find its AI-DLC workspace**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Low
- **Acceptance Criteria:**
  - [ ] Native folder picker (Electron `dialog`) to choose a project root
  - [ ] Detects `aidlc/spaces/` and reads `aidlc/active-space`; shows a clear message if the folder is not an AI-DLC project
  - [ ] Space switcher when more than one space exists
  - [ ] Remembers recently opened projects and reopens the last one on start
- **Dependencies:** None

**US-0102: Intent list** 📋 Planned
- As a **developer**, in order to **see all work at a glance**, I would like to **a list of all intents with scope, status and progress**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Low
- **Acceptance Criteria:**
  - [ ] Lists every intent from `intents.json`, newest first (by `dirName` date prefix)
  - [ ] Shows slug, scope, status, start date and completed/total executed stages
  - [ ] The active intent (`active-intent`) is highlighted
  - [ ] Filter by status and scope, free-text search on slug and request text
  - [ ] Intents present on disk but missing in `intents.json` (or vice versa) are shown, not hidden
- **Dependencies:** US-0101

**US-0103: Intent detail — phase & stage pipeline** 📋 Planned
- As a **developer**, in order to **understand where a workflow is right now**, I would like to **see the phases and stages of an intent as a pipeline**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] Shows the request text (`project-description.json`) and scope configuration (depth, test strategy) from `aidlc-state.md`
  - [ ] Pipeline grouped by phase; each stage shows status (not started / in progress / awaiting approval / revising / done / skipped), agent, start/end time and duration from `runtime-graph.json`
  - [ ] Skipped stages are visually muted; the current stage stands out
  - [ ] `aidlc-state.md` checkboxes and `runtime-graph.json` are merged; if they disagree, the state file wins and the mismatch is flagged
  - [ ] Works when `runtime-graph.json` is missing (e.g. a fresh clone, since it is git-ignored)
- **Dependencies:** US-0102

**US-0104: Audit timeline** 📋 Planned
- As a **developer**, in order to **follow what the agents actually did**, I would like to **a chronological timeline of audit events**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] Parses all `audit/*.md` files of an intent into events (timestamp, event type, all key/value fields)
  - [ ] Merges multiple audit files (one per machine) into one timeline sorted by timestamp
  - [ ] Events are colour-coded by category: stage, subagent, gate/approval, question/human, unit, error, guard/sensor
  - [ ] Noisy event types (`GUARD_DISABLED`, `SENSOR_PASSED`, …) are hidden by default and can be toggled on
  - [ ] Filter by event type and by stage; clicking an event shows all its fields
  - [ ] Parser tolerates unknown event types and fields
- **Dependencies:** US-0102

**US-0105: Bolt / unit DAG** 📋 Planned
- As a **developer**, in order to **see how construction work is split up**, I would like to **a graph of units, their dependencies and batches**.
- **Epic:** EPIC-01
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] Renders `bolt_dag.units` as a directed graph laid out by `batches` (one column per batch)
  - [ ] Node shows unit name and kind; colour by status derived from `UNIT_STARTED`/`UNIT_COMPLETED` audit events
  - [ ] Hidden (with a short note) when the intent has no `bolt_dag`
- **Dependencies:** US-0103, US-0104

**US-0106: Artifact reader** 📋 Planned
- As a **developer**, in order to **read what a stage produced without hunting for files**, I would like to **open stage artifacts inside the app**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Low
- **Acceptance Criteria:**
  - [ ] Each stage in the pipeline lists its files from `<phase>/<stage>/`
  - [ ] Markdown rendered (headings, tables, code, checkboxes); JSON pretty-printed
  - [ ] "Reveal in Finder" and "Open in editor" actions
  - [ ] Rendered markdown is sanitised (no script execution from artifact content)
- **Dependencies:** US-0103

**US-0107: Live updates** 📋 Planned
- As a **developer**, in order to **watch agents work in real time**, I would like to **the views to update automatically when AI-DLC writes files**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] Watches the active space's `intents/` folder recursively (ignoring `.aidlc-engine/` noise except `active-directive.json`)
  - [ ] Changes are debounced and only re-parse affected intents
  - [ ] New audit events are briefly highlighted in the timeline; a "live" indicator shows when an intent is in flight
  - [ ] Half-written files (invalid JSON mid-write) do not crash the UI; the last good state stays visible
- **Dependencies:** US-0102, US-0103, US-0104

**US-0108: Embedded Claude terminal** 📋 Planned
- As a **developer**, in order to **give Claude commands and answer AI-DLC gate questions from the console**, I would like to **a terminal panel inside the app that runs `claude` in the project folder**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] Terminal panel (xterm.js + node-pty) that starts `claude` with the project root as working directory, using the user's login shell environment (so `PATH`, `nvm` and the `aidlc` binary are found)
  - [ ] Full interactive support: colours, resize, copy/paste, keyboard input to pickers and gates
  - [ ] Panel can be shown/hidden and resized; the session survives switching views
  - [ ] Quick-action buttons that type common commands into the terminal: `/aidlc --status`, `/aidlc --doctor`, `/aidlc continue` (inserted, not auto-submitted)
  - [ ] Restart button if the process exits
- **Dependencies:** US-0101

**US-0109: Bridge UI theme** 📋 Planned
- As a **nerdy developer**, in order to **enjoy using the tool**, I would like to **a restrained LCARS-inspired sci-fi look**.
- **Epic:** EPIC-01
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] Dark theme by default: near-black background, rounded "elbow" frame panels, a small accent palette (amber/orange, lavender, blue, red for errors)
  - [ ] Condensed sans-serif headings (bundled locally, e.g. Antonio), readable body font for content and a monospace font for the terminal
  - [ ] Decoration never reduces readability: body text meets WCAG AA contrast, status is never shown by colour alone
  - [ ] Subtle motion only (e.g. pulse on live/in-progress); respects `prefers-reduced-motion`
  - [ ] No Star Trek trademarks, logos or copied assets; inspired-by only
- **Dependencies:** None

**US-0110: Security & packaging baseline** 📋 Planned
- As a **developer**, in order to **trust the app with my project files**, I would like to **a secure Electron setup that I can run and build locally**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Low
- **Acceptance Criteria:**
  - [ ] `contextIsolation: true`, `nodeIntegration: false`, sandboxed renderer; file system and pty access only through a narrow preload API
  - [ ] All AI-DLC file access is read-only and limited to the opened project root
  - [ ] `npm run dev` starts the app with hot reload; `npm run build` produces a macOS app
  - [ ] Parsers (intents, state, audit, runtime graph) have unit tests against fixtures copied from a real AI-DLC project
- **Dependencies:** None
