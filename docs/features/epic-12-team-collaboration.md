# EPIC-12: Team Collaboration — use git and AI-DLC so a team can work in the app together

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> The app is built for one person at one machine today. The GitHub panel (US-0502) brings in other people's AI-DLC work and helps with conflicts, but it does not show who is working on what. Asked for 2026-11-15: "think about how we can make team collaboration better in this application. I have no real concept about it yet, but we need to make sure we leverage the power of git as well as AI-DLC to enhance the value of this application for teams." This epic starts with a review and a concept; the stories that build it come out of that.

**Stories:** US-1201, US-1202

**Status (2026-11-16):** 🚧 US-1201 in progress, for v0.2.8. 📋 US-1202 planned. Each story names its release.

---

## User Stories

**US-1201: Review the GitHub panel and shape a team collaboration concept** 🚧 In progress, for v0.2.8
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

**US-1202: Warn when a story's branch is behind main or collides with another open pull request** 📋 Planned
- As a **developer who runs more than one story at a time**, in order to **find out before I approve and merge that a story that was "done" no longer fits with main**, I would like **the app to warn me when a story's branch is behind `main` or touches the same files as another open pull request, and to help me write down what the merge turned up**.
- **Epic:** EPIC-12
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-16, after US-0209 (#58) and US-0414 (#59) were both built in parallel from the same `main`. Each was green on its own branch. When #58 merged first, #59 conflicted in the code knowledge base, `intents.json` and a test file both had created. US-0209 had also added a native `title=` that US-0414's guard test rejects. The person wants this caught before the "done" is trusted, and documented in the intent when it happens. The project rule (`aidlc/spaces/default/memory/project.md`, Way of Working) now asks for this by hand; this story makes the app help.
- **Acceptance Criteria:**
  - [ ] **Given** an intent whose story branch is behind `origin/main`, **when** I look at the intent, **then** the app says how many commits behind it is and that the tests should run again after main is merged in.
  - [ ] **Given** two open pull requests that change the same files, **when** I look at either intent, **then** the app names the other pull request and the shared files, and says which files would conflict (from `git merge-tree`, without changing the working tree).
  - [ ] The check runs on the app's own read-only git calls and does not fetch, merge or push by itself; a refresh button runs `git fetch` only when I press it.
  - [ ] **Given** a merge that turned up conflicts or failures after the story was approved, **when** I choose to record it, **then** the app opens the intent's `construction/build-and-test/test-results.md` in the editor with an "Efter merge med main" section ready to fill in (what was wrong, cause, fix and commit, new results, lesson). It writes nothing else under `aidlc/`.
  - [ ] Every text goes through `t()` in Swedish and English.
- **Notes:** Shape it together with the US-1201 concept (who works on what; how two people avoid the same story). The audit `Recovery:` note stays an AI-DLC command (`aidlc engine audit append-raw`), which the app may offer to type into the terminal but never writes itself.
- **Dependencies:** US-0502, US-1201
