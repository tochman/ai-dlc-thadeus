# EPIC-03: Audit Timeline

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> The audit log is the most honest record of what the agents did, but real intents produce thousands of events (visinv's `epic02-finish` has 1 726). This epic makes the timeline handle any length smoothly and makes it precise about what is new, so the user can follow a run as it happens and dig into history without the app slowing down or hiding events.

**Stories:** US-0301, US-0302

**Status (2026-11-13):** ✅ Released in v0.2.0. The basic timeline was built in EPIC-01 (US-0104). The 20 000-event timing in a real Electron renderer is checked in Build and Test.

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
