# EPIC-06: Feature Docs

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Many projects describe their product in a feature document: an overview (`docs/FEATURES.md`) listing epics, and one file per epic (`docs/features/epic-XX-*.md`) with user stories, acceptance criteria and status. The format is not part of AI-DLC, but it works well together with it: the feature docs say *what* and *why*, and AI-DLC's records say *how* and *when*. The console should offer this format when a project is set up, and let people read and follow it next to the AI-DLC work.

**Stories:** US-0601, US-0602

**Status (2026-11-13):** ✅ Released in v0.2.0. Both stories are built with AI-DLC in `express` scope (intent `261113-feature-docs`) and the unit tests are green. The manual checks in Electron (live updates, settings, setup offer, timing) are done in Build and Test.

**Decisions:**
- **Q1 (where the view lives):** a switch "Intents | Features" at the top of the project view. Features replaces the sidebar and content area; the terminal stays.
- **Q2 (where the setting lives):** a gear button on the project tab opens a "Projektinställningar" dialog with Automatiskt / Visa / Dölj and the path to the overview.
- **Q3 (projects without AI-DLC):** yes. When `docs/FEATURES.md` exists, the switch reads "Uppsättning | Features" on the setup screen.

---

## The format

- `docs/FEATURES.md`: a short introduction and a table with one row per epic (link, topic, status).
- `docs/features/epic-XX-<slug>.md`: an epic description, a `**Stories:**` line, a `**Status (date):**` line, and stories as `**US-XXYY: Title** <status>` followed by As a / in order to / I would like to, Epic, Priority, Complexity, Acceptance Criteria (checkboxes, preferably Given/When/Then), Notes and Dependencies.
- Status markers: 📋 Planned, 🚧 In progress / built not released, ✅ Done.
- Epics are organised by topic, not by release.

---

## User Stories

**US-0601: Offer feature docs when setting up AI-DLC** ✅ Released in v0.2.0
- As a **developer starting AI-DLC in a project**, in order to **keep a readable product description with epics and user stories alongside the AI-DLC records**, I would like to **be asked during setup whether the project should use separate feature descriptions, and get them created if I say yes**.
- **Epic:** EPIC-06
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] **Given** I set up AI-DLC in a folder (US-0503), **when** the setup dialog is shown, **then** it has a choice "Använd separata feature-beskrivningar (FEATURES.md + en fil per epic)". It is off by default and has a short explanation and an example.
  - [x] **Given** I turn it on and the project has no `docs/FEATURES.md`, **when** setup has finished, **then** a request is typed into the visible claude terminal asking Claude to create `docs/FEATURES.md` and `docs/features/` in the format above, based on what the project already contains (README, code). I confirm it with Enter. (The request is typed when I press "Skapa feature-beskrivningar" in the "AI-DLC är uppsatt" banner.)
  - [x] **Given** I turn it on, **then** the same request asks Claude to add a project rule in `aidlc/spaces/default/memory/project.md` (through AI-DLC's own way of recording rules, not by editing the file behind its back): new work is described as stories in the matching epic file, and statuses and acceptance criteria are updated when work is built and released.
  - [x] **Given** the project already has `docs/FEATURES.md`, **then** nothing is created. The dialog says "Feature-beskrivningar finns redan" and the choice only adds the project rule.
  - [x] **Given** a project that already uses AI-DLC but has no feature docs, **then** the feature-docs view (US-0602) offers the same "Sätt upp feature-beskrivningar" action. (Also in the "Projektinställningar" dialog.)
  - [x] The app writes no files itself. Everything is created by Claude in the visible terminal, after I have confirmed it.
- **Notes:** Where the docs live (`docs/`) could be a setting, but `docs/FEATURES.md` is the default and enough for now.
- **Dependencies:** US-0503, US-0102

**US-0602: View epics and user stories in the console** ✅ Released in v0.2.0
- As a **developer or product owner following the work**, in order to **see what is planned, being built and done without opening Markdown files in an editor**, I would like to **a "Features" view that shows the epics and their stories with status and acceptance criteria**.
- **Epic:** EPIC-06
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] **Given** a project that already has `docs/FEATURES.md`, whether or not it was set up through the console, **when** I open the project, **then** the app detects it and shows a "Features" view next to the intents. It lists every epic from the overview table with topic and status.
  - [x] **Setting "Feature-beskrivningar" per project**, in the app's settings and saved in the app's own `settings.json`. It is never written to the project:
    - **Automatiskt** (default): the view is shown when `docs/FEATURES.md` exists.
    - **Visa**: the view is always shown. Without docs it explains the format and offers setup (US-0601).
    - **Dölj**: the view is never shown, even if the docs exist.
  - [x] The same setting lets me point to another location than `docs/FEATURES.md` (for example `FEATURES.md` in the root), for projects that keep the docs elsewhere.
  - [x] **Given** I open an epic, **then** I see its description and its stories, each with ID, title, status, priority and complexity, and progress on the acceptance criteria (for example "5/8 kriterier").
  - [x] **Given** I open a story, **then** I see the full text with acceptance criteria as read-only checkboxes, notes and dependencies, rendered like the artifact reader (US-0107).
  - [x] I can filter stories by status (Planned, In progress, Done) and by priority.
  - [x] **Given** a story ID such as `US-0201` is mentioned in an intent's records (for example its requirements or project description), **then** the story shows a link to that intent, and the intent shows a link back to the story.
  - [x] **Given** the files change (for example Claude ticks a criterion), **then** the view updates live, like the rest of the console (US-0109).
  - [x] **Given** a file does not follow the format exactly, **then** the view still shows what it can read and falls back to rendering the file as Markdown. It never crashes and never shows a blank view.
  - [x] **Given** a project without feature docs and the setting **Visa**, **then** the view explains the format and offers setup (US-0601). With **Automatiskt**, a project without docs shows no view, only a discreet "Sätt upp feature-beskrivningar" in the project menu. (The project menu is the "Projektinställningar" dialog behind the gear on the tab.)
  - [x] Read-only: the view never changes the files. Links "Öppna i editor" and "Visa i Finder" as in the artifact reader.
- **Dependencies:** US-0107, US-0109, US-0601
