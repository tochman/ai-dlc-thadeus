# EPIC-03: Audit Timeline

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> The audit log is the most honest record of what the agents did, but real intents produce thousands of events (one reference project's `epic02-finish` has 1 726). This epic makes the timeline handle any length smoothly and makes it precise about what is new, so the user can follow a run as it happens and dig into history without the app slowing down or hiding events.

**Stories:** US-0301–US-0308

**Status (2026-11-24):** ✅ US-0301–US-0302 released in v0.2.0. ✅ US-0303 released in v0.2.9. 📋 US-0304 planned, for v0.3.3. 📋 US-0305–US-0307 planned, for v0.3.5. 📋 US-0308 planned, for v0.3.6. Each story names its release.

**Dependency choice (Q1):** `@tanstack/react-virtual` `3.14.24`, pinned exactly. Hand-rolled windowing with variable row heights, measurement after expand and scroll anchoring would be more code to keep correct than this small, well-maintained library.

---

## User Stories

**US-0301: Virtualised timeline for very long audit logs** ✅ Released in v0.2.0
- As a **developer**, in order to **browse the full history of a long-running intent**, I would like to **the timeline to render any number of events smoothly, without a row cap**.
- **Epic:** EPIC-03
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] The 1 500-row cap in `Timeline.jsx` (marked `ponytail:`) is removed. Every event matching the filters can be reached.
  - [ ] Only visible rows (plus a small buffer) are rendered. Given 20 000 events, scrolling stays smooth and the timeline renders in under 200 ms after a filter change. (Windowing is built; the Electron timing is pending Build and Test.)
  - [x] Rows with an expanded detail panel keep working (variable row height)
  - [x] "Jump to newest" and "jump to stage start" actions. The scroll position is kept when new events arrive, unless the user is already at the newest end.
  - [x] Keyboard navigation (up/down, Enter to expand) and screen-reader labels still work with virtualisation
  - [x] No new dependency unless a small, well-maintained one is clearly simpler than hand-rolled windowing. The choice is recorded in the plan.
- **Dependencies:** US-0104

**US-0302: Accurate "new event" highlighting** ✅ Released in v0.2.0
- As a **developer**, in order to **see exactly what just happened**, I would like to **only truly new audit events to be highlighted**.
- **Epic:** EPIC-03
- **Priority:** Medium
- **Complexity:** Low
- **Acceptance Criteria:**
  - [x] New events are identified by a stable key (source file plus position, or timestamp plus event plus fields hash), not by count
  - [x] An event from another machine's audit file with an older timestamp is highlighted correctly and does not make another row flash
  - [x] A counter "N nya händelser" is shown when new events arrive outside the visible area
- **Dependencies:** US-0104, US-0107

**US-0303: Project velocity: intent, story and project metrics** ✅ Released in v0.2.9
- As a **developer or team lead**, in order to **see how fast work moves and where it waits**, I would like to **metrics per intent, per story and per project, built from the AI-DLC records the app already reads**.
- **Epic:** EPIC-03
- **Priority:** Medium
- **Complexity:** Large
- **Acceptance Criteria:**
  - [x] **Intent:** total time from start to finish, time per phase and per stage, time spent waiting at the person's approvals, and review rounds per stage, all taken from the intent's audit log and state.
  - [x] **Story:** time from 🚧 In progress to ✅ Done to "Released in vX.Y.Z", and the stories delivered per release, taken from the feature docs and their git history.
  - [x] **Project:** intents and stories finished per week and per month, the average intent length, and the trend over time.
  - [x] An intent still running shows its numbers so far and is marked as not finished; a missing or unreadable record is named, not counted as zero.
  - [x] Numbers are computed from the records, never typed in, and the view says which records it used.
  - [x] Every text goes through `t()` in Swedish and English.
- **Dependencies:** US-0104, US-0201 (cost per run, shown beside velocity)

**US-0304: Intent spans: one shared reading of the audit log** 📋 Planned, for v0.3.3
- As a **developer of THADEUS**, in order to **build every time based view on one agreed reading of the audit log**, I would like **one pure module that turns an intent's audit events into spans, and says what the intent looked like at any moment**.
- **Epic:** EPIC-03
- **Priority:** High
- **Complexity:** Large
- **Source:** GitHub issue [#99](https://github.com/tochman/ai-dlc-thadeus/issues/99)
- **Background:** Today `workingAgents`, `questions.js`, `sessionHandoff.js` and `tokenHistory.js` each pair events on their own. The waterfall, live graph, lenses and replay (US-0305–US-0308) need the same model. Nothing visible ships in this story.
- **Acceptance Criteria:**
  - [ ] **Given** the fixtures under `tests/fixtures/audit/spans/` (stage, gate wait, questions with and without `Question Id`, park, backward and redo jumps, overlapping and unfinished dispatches, two interleaved shards), **then** `buildSpans` in `src/main/parsers/spans.js` returns exactly each fixture's expected spans.
  - [ ] **Given** a stage span with a gate wait and a question wait, **then** `timeShare` gives parts that add up to the span's length, to the millisecond.
  - [ ] **Given** `t` = the last event, **then** `stateAt` agrees with what the Pipeline view shows.
  - [ ] `workingAgents` is rewritten on top of `buildSpans`, and its existing tests pass unchanged.
  - [ ] **Given** the largest audit shard in the repository (about 14,000 lines), **then** `buildSpans` runs in under 50 ms.
  - [ ] Unknown events and blocks without a timestamp never throw. The module has no `fs` or Electron imports and at least 90% line coverage. `loadIntentDetail` adds `detail.spans`.
- **Dependencies:** US-0104, US-0507

**US-0305: Waterfall: stages, units and agents on one time axis, with waiting time and cost** 📋 Planned, for v0.3.5
- As a **developer**, in order to **see where an intent's time went, and how much of it was waiting for me**, I would like **a waterfall of every stage, unit and agent on one time axis, with waiting time marked inside each bar and the cost drawn underneath**.
- **Epic:** EPIC-03
- **Priority:** High
- **Complexity:** Large
- **Source:** GitHub issue [#100](https://github.com/tochman/ai-dlc-thadeus/issues/100)
- **Acceptance Criteria:**
  - [ ] **Given** an intent with `detail.spans`, **when** I open the new Waterfall tab, **then** phases, stages, units and agents show on one time axis, one bar per span.
  - [ ] **Given** a stage that waited 12 minutes at its gate, **then** its bar shows a 12 minute hatched coral segment, and the panel says `Waiting for approval 12 min`.
  - [ ] The header readout equals `timeShare` for the whole intent; the waiting share leaves parked time out.
  - [ ] **Given** recorded token readings, **then** the cost track ends at the Cost tab's total, within one cent.
  - [ ] **Given** a complete intent with an overnight pause, **then** the pause is folded with its length, and the toggle shows it at full width.
  - [ ] **When** I click an event in the panel, **then** the Timeline tab opens with that row expanded and in view.
  - [ ] **Given** an intent in flight, **then** running bars grow live and stop when the stage completes. **Given** a backward jump, **then** the stage shows two attempt rows and a jump marker.
  - [ ] Drawn with the `@visx/*` packages already installed. Keyboard and screen reader access, colour never the only signal, every text through `t()` in Swedish and English, in the LCARS look.
- **Dependencies:** US-0304, US-0301, US-0208, US-0215

**US-0306: Live unit graph: node states, agents, cost and edge pulses** 📋 Planned, for v0.3.5
- As a **developer**, in order to **see Construction at work in one glance**, I would like **the unit graph to show each unit's state, agent and cost live, with edges lighting up as work moves on**.
- **Epic:** EPIC-03
- **Priority:** Medium
- **Complexity:** Medium
- **Source:** GitHub issue [#101](https://github.com/tochman/ai-dlc-thadeus/issues/101)
- **Acceptance Criteria:**
  - [ ] **Given** a unit running, **then** its node breathes and names its stage and agent, and its time advances live. **Given** a unit waiting at its gate, **then** it shows the coral attention frame.
  - [ ] **Given** a unit that completes while a dependent unit starts, **then** the edge between them pulses once; under reduced motion it lights without moving.
  - [ ] **Given** a unit sent back twice by backward jumps, **then** its node shows a back arrow with `2`, and the tooltip names both jumps.
  - [ ] **When** I click a node, **then** a side panel lists its stages, artifacts, reviews and cost, and an artifact opens in the reader.
  - [ ] Pan, zoom, Fit and a minimap for large graphs. Nodes are focusable with an `aria-label`, and arrow keys follow the edges.
  - [ ] `BoltDag.jsx` keeps its hand built SVG. Tests for every node state and reduced motion. Every text through `t()` in Swedish and English, in the LCARS look.
- **Notes:** Moving the graph onto the plan designer's canvas (US-0906) is a later choice, not part of this story.
- **Dependencies:** US-0304

**US-0307: Timeline lenses: Compact, Timeline and Full, with event groups** 📋 Planned, for v0.3.5
- As a **developer**, in order to **read an intent's history at the level of detail I need right now**, I would like **the Timeline to offer three lenses and to group events that belong together**.
- **Epic:** EPIC-03
- **Priority:** Medium
- **Complexity:** Medium
- **Source:** GitHub issue [#102](https://github.com/tochman/ai-dlc-thadeus/issues/102)
- **Acceptance Criteria:**
  - [ ] **Given** a gate with a question and an approval, **then** the Compact lens shows one row naming the stage, the wait and the outcome, and expanding it shows the events in order.
  - [ ] **Given** two review rounds, NOT-READY then READY, **then** they show as one review group naming both verdicts. **Given** a backward jump, **then** its group names source, target and the number of invalidated artifacts.
  - [ ] **Given** the Full lens, **then** every event shows, and the events of one group are joined in a gutter.
  - [ ] The Timeline lens is today's list, unchanged, and stays the default.
  - [ ] **When** I change lens, **then** the filters and the scroll position are kept, and the choice is restored after a restart.
  - [ ] **Given** the largest intent in the repository, **then** switching lens takes under 100 ms.
  - [ ] Grouping is a pure function in `src/shared/eventGroups.js` with its own tests. Every text through `t()` in Swedish and English, in the LCARS look.
- **Dependencies:** US-0304, US-0301

**US-0308: Bridge replay: scrub through an intent's history and watch it play back** 📋 Planned, for v0.3.6
- As a **developer, or someone showing AI-DLC to others**, in order to **understand and show how an intent unfolded**, I would like **a replay mode that plays the intent's history back, with a scrubber I can drag, play and step through**.
- **Epic:** EPIC-03
- **Priority:** Medium
- **Complexity:** Large
- **Source:** GitHub issue [#106](https://github.com/tochman/ai-dlc-thadeus/issues/106)
- **Acceptance Criteria:**
  - [ ] **When** I open Replay on a complete intent and press Space, **then** the unit graph (or the Pipeline cards), the waterfall and the readouts play the intent from first to last event at the chosen speed.
  - [ ] **When** I drag the playhead to any point, **then** every node, bar and readout matches `stateAt` for that time.
  - [ ] **Given** Skip idle, **then** playback jumps over gaps longer than two minutes and briefly shows the skipped length.
  - [ ] **When** I press `]`, **then** the playhead moves to the next marker. **Given** a question in the history, **then** a read only ghost shows its options and the reply that was given.
  - [ ] **Given** an intent in flight, **then** the scrubber follows now until I drag back, and Return to live restores it.
  - [ ] Playback works under reduced motion, without animated transitions. Scrubbing the largest intent holds 60 frames per second on an M1, measured and written down here.
  - [ ] Every control reachable by keyboard. Every text through `t()` in Swedish and English, in the LCARS look.
- **Notes:** The issue splits this into scrubber, graph, waterfall and ghosts; that split is made at Units Generation. Recording a replay to a video file (the issue's stretch) is left out for now.
- **Dependencies:** US-0304, US-0305, US-0306
