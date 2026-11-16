# EPIC-12: Team Collaboration — use git and AI-DLC so a team can work in the app together

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> The app is built for one person at one machine today. The GitHub panel (US-0502) brings in other people's AI-DLC work and helps with conflicts, but it does not show who is working on what. Asked for 2026-11-15: "think about how we can make team collaboration better in this application. I have no real concept about it yet, but we need to make sure we leverage the power of git as well as AI-DLC to enhance the value of this application for teams." This epic starts with a review and a concept; the stories that build it come out of that.

**Stories:** US-1201

**Status (2026-11-15):** 📋 US-1201 planned for v0.2.8. Each story names its release.

---

## User Stories

**US-1201: Review the GitHub panel and shape a team collaboration concept** 📋 Planned, for v0.2.8
- As a **developer working on a project with a team**, in order to **see and coordinate what everyone is doing without leaving the app**, I would like to **have the GitHub panel reviewed and a concept for team collaboration worked out, built on git and AI-DLC**.
- **Epic:** EPIC-12
- **Priority:** High
- **Complexity:** Medium (a review and a concept, no code)
- **Background:** Asked for 2026-11-15, for v0.3.0. There is no concept yet, so this story is discovery: its result is a concept the person approves and the stories that build it.
- **Acceptance Criteria:**
  - [ ] **Given** the GitHub panel as it is today (`src/renderer/RefreshPanel.jsx`), **then** a review lists what it does well, what is missing or confusing, and what should change, with screenshots or concrete examples.
  - [ ] **Given** what git already gives a team (branches, pull requests, reviews, tags, history, who committed what), **then** the concept names which of these the app should show or drive, and which it should leave to GitHub.
  - [ ] **Given** what AI-DLC already gives a team (shared memory in `team.md` and `project.md`, per-clone audit shards, one intent per piece of work, spaces, team-owned Units and the team board in Construction), **then** the concept names how the app uses each one, or why it does not.
  - [ ] The concept answers at least: who is working on which intent and story right now; how a teammate's approvals, reviews and open questions reach the others; how two people avoid working on the same story; and how a new team member gets started in the project.
  - [ ] The concept is written up in this epic, with the questions left open, and the person approves it before any build story starts.
  - [ ] It ends with new stories in this epic (or in the topic's own epic), each with acceptance criteria and a release, in v0.3.0 or later.
- **Notes:**
  - **How to run it.** A good fit for an AI-DLC workflow with ideation stages (intent capture, scope), since the problem is still open.
  - **Related.** US-0502 (the GitHub panel), US-0507 (what the agents are doing), US-0804 (signing in to each tool), US-1101 (a public repository and outside contributors), US-0605 (planning releases together).
- **Dependencies:** US-0502
