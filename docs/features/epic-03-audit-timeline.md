# EPIC-03: Audit Timeline

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> The audit log is the most honest record of what the agents did, but real intents produce thousands of events (visinv's `epic02-finish` has 1 726). This epic makes the timeline handle any length smoothly and makes it precise about what is new, so the user can follow a run as it happens and dig into history without the app slowing down or hiding events.

**Stories:** US-0301, US-0302

**Status (2026-11-13):** 📋 Planned. The basic timeline was built in EPIC-01 (US-0104).

---

## User Stories

**US-0301: Virtualised timeline for very long audit logs** 📋 Planned
- As a **developer**, in order to **browse the full history of a long-running intent**, I would like to **the timeline to render any number of events smoothly, without a row cap**.
- **Epic:** EPIC-03
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] The 1 500-row cap in `Timeline.jsx` (marked `ponytail:`) is removed. Every event matching the filters can be reached.
  - [ ] Only visible rows (plus a small buffer) are rendered. Given 20 000 events, scrolling stays smooth and the timeline renders in under 200 ms after a filter change.
  - [ ] Rows with an expanded detail panel keep working (variable row height)
  - [ ] "Jump to newest" and "jump to stage start" actions. The scroll position is kept when new events arrive, unless the user is already at the newest end.
  - [ ] Keyboard navigation (up/down, Enter to expand) and screen-reader labels still work with virtualisation
  - [ ] No new dependency unless a small, well-maintained one is clearly simpler than hand-rolled windowing. The choice is recorded in the plan.
- **Dependencies:** US-0104

**US-0302: Accurate "new event" highlighting** 📋 Planned
- As a **developer**, in order to **see exactly what just happened**, I would like to **only truly new audit events to be highlighted**.
- **Epic:** EPIC-03
- **Priority:** Medium
- **Complexity:** Low
- **Acceptance Criteria:**
  - [ ] New events are identified by a stable key (source file plus position, or timestamp plus event plus fields hash), not by count
  - [ ] An event from another machine's audit file with an older timestamp is highlighted correctly and does not make another row flash
  - [ ] A counter "N nya händelser" is shown when new events arrive outside the visible area
- **Dependencies:** US-0104, US-0107
