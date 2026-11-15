# EPIC-01: Bridge Console MVP

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> An Electron desktop app that sits on top of an AI-DLC project and shows what the agents are doing: which intents exist, where each workflow is in its phases and stages, what happened when (audit log), how bolts/units depend on each other, and what each stage produced. It updates live while agents work, and embeds a terminal running `claude` in the project folder so the user can give commands and answer gate questions without leaving the app. The look is inspired by the LCARS interfaces of modern Star Trek (Picard, Discovery, Strange New Worlds): dark, rounded elbow panels, a restrained accent palette — but readability always wins over decoration.

**Stories:** US-0101, US-0102, US-0103, US-0104, US-0105, US-0106, US-0107, US-0108, US-0109, US-0110

**Status (2026-11-15):** ✅ US-0101–US-0110 released in v0.1.0. Each story names its release.

**Beslut från kravanalysen:** React med vanlig JavaScript och electron-vite (Q1). Både en `claude`-flik och en skalflik i terminalen (Q2). Flera projekt som flikar i samma fönster (Q3). Osignerat lokalt macOS-bygge (Q4).

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

**US-0101: Open AI-DLC projects as tabs** ✅ Released in v0.1.0
- As a **developer using AI-DLC**, in order to **look at any of my projects**, I would like to **pick project folders, have the app find their AI-DLC workspaces and keep each project in its own tab**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Low
- **Beslut Q3:** flera projekt visas som flikar i samma fönster.
- **Acceptance Criteria:**
  - [x] Native folder picker (Electron `dialog`) to choose a project root, opened in a new project tab
  - [x] Detects `aidlc/spaces/` and reads `aidlc/active-space`; shows a clear message if the folder is not an AI-DLC project
  - [x] Space switcher when more than one space exists
  - [x] Several projects open as tabs in one window; a tab can be closed and you switch project by switching tab
  - [x] Remembers recently opened projects and reopens the same tabs on start
- **Dependencies:** None

**US-0102: Intent list** ✅ Released in v0.1.0
- As a **developer**, in order to **see all work at a glance**, I would like to **a list of all intents with scope, status and progress**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Low
- **Acceptance Criteria:**
  - [x] Lists every intent from `intents.json`, newest first (by `dirName` date prefix)
  - [x] Shows slug, scope, status, start date and completed/total executed stages
  - [x] The active intent (`active-intent`) is highlighted
  - [x] Filter by status and scope, free-text search on slug and request text
  - [x] Intents present on disk but missing in `intents.json` (or vice versa) are shown, not hidden
- **Dependencies:** US-0101

**US-0103: Intent detail — phase & stage pipeline** ✅ Released in v0.1.0
- As a **developer**, in order to **understand where a workflow is right now**, I would like to **see the phases and stages of an intent as a pipeline**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] Shows the request text (`project-description.json`) and scope configuration (depth, test strategy) from `aidlc-state.md`
  - [x] Pipeline grouped by phase; each stage shows status (not started / in progress / awaiting approval / revising / done / skipped), agent, start/end time and duration from `runtime-graph.json`
  - [x] Skipped stages are visually muted; the current stage stands out
  - [x] `aidlc-state.md` checkboxes and `runtime-graph.json` are merged; if they disagree, the state file wins and the mismatch is flagged
  - [x] Works when `runtime-graph.json` is missing (e.g. a fresh clone, since it is git-ignored)
- **Dependencies:** US-0102

**US-0104: Audit timeline** ✅ Released in v0.1.0
- As a **developer**, in order to **follow what the agents actually did**, I would like to **a chronological timeline of audit events**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] Parses all `audit/*.md` files of an intent into events (timestamp, event type, all key/value fields)
  - [x] Merges multiple audit files (one per machine) into one timeline sorted by timestamp
  - [x] Events are colour-coded by category: stage, subagent, gate/approval, question/human, unit, error, guard/sensor
  - [x] Noisy event types (`GUARD_DISABLED`, `SENSOR_PASSED`, …) are hidden by default and can be toggled on
  - [x] Filter by event type and by stage; clicking an event shows all its fields
  - [x] Parser tolerates unknown event types and fields
- **Dependencies:** US-0102

**US-0105: Bolt / unit DAG** ✅ Released in v0.1.0
- As a **developer**, in order to **see how construction work is split up**, I would like to **a graph of units, their dependencies and batches**.
- **Epic:** EPIC-01
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] Renders `bolt_dag.units` as a directed graph laid out by `batches` (one column per batch)
  - [x] Node shows unit name and kind; colour by status derived from `UNIT_STARTED`/`UNIT_COMPLETED` audit events
  - [x] Hidden (with a short note) when the intent has no `bolt_dag`
- **Dependencies:** US-0103, US-0104

**US-0106: Artifact reader** ✅ Released in v0.1.0
- As a **developer**, in order to **read what a stage produced without hunting for files**, I would like to **open stage artifacts inside the app**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Low
- **Acceptance Criteria:**
  - [x] Each stage in the pipeline lists its files from `<phase>/<stage>/`
  - [x] Markdown rendered (headings, tables, code, checkboxes); JSON pretty-printed
  - [x] "Reveal in Finder" and "Open in editor" actions
  - [x] Rendered markdown is sanitised (no script execution from artifact content)
- **Dependencies:** US-0103

**US-0107: Live updates** ✅ Released in v0.1.0
- As a **developer**, in order to **watch agents work in real time**, I would like to **the views to update automatically when AI-DLC writes files**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] Watches the active space's `intents/` folder recursively (ignoring `.aidlc-engine/` noise except `active-directive.json`)
  - [x] Changes are debounced and only re-parse affected intents
  - [x] New audit events are briefly highlighted in the timeline; a "live" indicator shows when an intent is in flight
  - [x] Half-written files (invalid JSON mid-write) do not crash the UI; the last good state stays visible
- **Dependencies:** US-0102, US-0103, US-0104

**US-0108: Embedded Claude and shell terminal** ✅ Released in v0.1.0
- As a **developer**, in order to **give Claude commands and answer AI-DLC gate questions from the console**, I would like to **a terminal panel inside each project tab with one tab running `claude` and one with my login shell, both in the project folder**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Medium
- **Beslut Q2:** terminalpanelen har två flikar, `claude` och `shell`.
- **Acceptance Criteria:**
  - [x] Terminal panel (xterm.js + node-pty) per project tab with two terminal tabs: `claude` and the user's login shell, both with the project root as working directory, using the user's login shell environment (so `PATH`, `nvm` and the `aidlc` binary are found)
  - [x] Full interactive support: colours, resize, copy/paste, keyboard input to pickers and gates
  - [x] Panel can be shown/hidden and resized; the sessions survive switching views and project tabs
  - [x] Quick-action buttons that type common commands into the `claude` tab: `/aidlc --status`, `/aidlc --doctor`, `/aidlc continue` (inserted, not auto-submitted)
  - [x] Restart button if the process exits
  - [x] Closing a project tab ends its terminal processes
- **Dependencies:** US-0101

**US-0109: Bridge UI theme** ✅ Released in v0.1.0
- As a **nerdy developer**, in order to **enjoy using the tool**, I would like to **a restrained LCARS-inspired sci-fi look**.
- **Epic:** EPIC-01
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] Dark theme by default: near-black background, rounded "elbow" frame panels, a small accent palette (amber/orange, lavender, blue, red for errors)
  - [x] Condensed sans-serif headings (bundled locally, e.g. Antonio), readable body font for content and a monospace font for the terminal
  - [x] Decoration never reduces readability: body text meets WCAG AA contrast, status is never shown by colour alone
  - [x] Subtle motion only (e.g. pulse on live/in-progress); respects `prefers-reduced-motion`
  - [x] No Star Trek trademarks, logos or copied assets; inspired-by only
  - [x] Auctum-profilering: appen heter "Auctum AIDLC Control" (fönstertitel, sidhuvud, `productName`, `appId: se.auctum.aidlc-control`). Den geometriska Auctum-loggan visas på en startskärm medan flikarna återställs (minst 900 ms, högst 4 s, utan animation vid `prefers-reduced-motion`), i sidhuvudet och i tomläget. Loggan har det tillgängliga namnet "Auctum".
- **Dependencies:** None

**US-0110: Security & packaging baseline** ✅ Released in v0.1.0
- As a **developer**, in order to **trust the app with my project files**, I would like to **a secure Electron setup that I can run and build locally**.
- **Epic:** EPIC-01
- **Priority:** High
- **Complexity:** Low
- **Acceptance Criteria:**
  - [x] `contextIsolation: true`, `nodeIntegration: false`, sandboxed renderer; file system and pty access only through a narrow preload API
  - [x] All AI-DLC file access is read-only and limited to the opened project root
  - [x] `npm run dev` starts the app with hot reload; `npm run build` produces an unsigned macOS app (.app/.dmg). Verifierat i Build and Test 2026-11-13.
  - [x] Parsers (intents, state, audit, runtime graph) have unit tests against fixtures copied from a real AI-DLC project
  - [x] Release pipeline (beslut 2026-11-13): when a `vX.Y.Z` tag is pushed, `.github/workflows/release.yml` builds an unsigned universal macOS `.dmg` and a Linux `.deb` (x64) and publishes them to a GitHub Release in the private repo. Linux is a new target, so NFR5 now covers macOS and Linux. Konfigurationen finns. Den första releasen verifieras i Deployment Execution.
- **Dependencies:** None
