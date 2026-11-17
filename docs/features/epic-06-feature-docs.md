# EPIC-06: Feature Docs

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Many projects describe their product in a feature document: an overview (`docs/FEATURES.md`) listing epics, and one file per epic (`docs/features/epic-XX-*.md`) with user stories, acceptance criteria and status. The format is not part of AI-DLC, but it works well together with it: the feature docs say *what* and *why*, and AI-DLC's records say *how* and *when*. The console should offer this format when a project is set up, and let people read and follow it next to the AI-DLC work.

**Stories:** US-0601, US-0602, US-0603, US-0604, US-0605, US-0606, US-0607

**Status (2026-11-17):** ✅ US-0601–US-0603 released (v0.2.0–v0.2.5). ✅ US-0604 and US-0605 released in v0.2.7. 📋 US-0606 and US-0607 planned. Each story names its release.

**Decisions:**
- **Q1 (where the view lives):** a switch "Intents | Features" at the top of the project view. Features replaces the sidebar and content area; the terminal stays.
- **Q2 (where the setting lives):** a gear button on the project tab opens a "Projektinställningar" dialog with Automatiskt / Visa / Dölj and the path to the overview.
- **Q3 (projects without AI-DLC):** yes. When `docs/FEATURES.md` exists, the switch reads "Uppsättning | Features" on the setup screen.

---

## The format

- `docs/FEATURES.md`: a short introduction and a table with one row per epic (link, topic, status).
- `docs/features/epic-XX-<slug>.md`: an epic description, a `**Stories:**` line, a `**Status (date):**` line, and stories as `**US-XXYY: Title** <status>` followed by As a / in order to / I would like to, Epic, Priority, Complexity, Acceptance Criteria (checkboxes, preferably Given/When/Then), Notes and Dependencies.
- Status markers: 📋 Planned, 🚧 In progress, ✅ Done (merged; "Released in vX.Y.Z" is added when a release includes it).
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

**US-0603: Releases or continuous deployment, and stories marked for a release** ✅ Released in v0.2.5 (intent `261115-release-handling`, ultra-express)
- As a **developer planning what ships when**, in order to **see and shape each release**, I would like to **choose per project whether it ships in releases or continuously, and mark stories for a release in the app**.
- **Epic:** EPIC-06
- **Priority:** High
- **Complexity:** Medium
- **Background:** Asked for 2026-11-15: "in some project (like this one) we work with releases. In others we do continuous deployment. I would like to add release handling to this app and to be able to mark user stories to a release. that would help in planning."
- **Acceptance Criteria:**
  - [x] Each project has a setting: **Releases** or **Continuous deployment**.
  - [x] With Releases, a story can be marked for a release (`for vX.Y.Z`) or have it removed, from the story in the app. The app writes the same marker the epic file and `FEATURES.md` already use, and nothing else in the files changes.
  - [x] A release list shows each release with its stories and their status: planned releases from the story markers, released ones from the project's git tags (`vX.Y.Z`), with the date.
  - [x] With Continuous deployment, release fields and the release list are hidden, and a story has its own last status, **🚀 Deployed**, set when its change is deployed (after ✅ Done).
  - [x] The story lifecycle rule follows the project's choice and keeps every story's status current at all times: 📋 Planned → 🚧 In progress when work starts → ✅ Done when built and approved → "for vX.Y.Z" and "Released in vX.Y.Z" at the tag (Releases), or 🚀 Deployed at deploy (Continuous deployment).
  - [x] The rule applies to every project opened in the app, not only at feature-docs setup: when a project's AI-DLC memory lacks the rule, or holds an older one, the app offers to add or update it through AI-DLC's own rule mechanism (as US-0003), and changing the project's setting updates the rule.
  - [x] The epic and story views and the docs status check understand 🚀 Deployed (counts, colours, filter).
  - [x] A story whose release is tagged but still says "for vX.Y.Z" is flagged, as `featureDocsStatus.test.js` would flag it.
  - [x] Every text goes through `t()` in Swedish and English.
- **Notes:** The release markers are already the docs' own format (project rule: "for vX.Y.Z", then "Released in vX.Y.Z"), so no new data store is needed.
- **Dependencies:** US-0602, US-0003

**US-0604: Filter epics and user stories** ✅ Released in v0.2.7
- As a **developer looking for the next thing to work on**, in order to **find stories quickly in a long backlog**, I would like to **filter epics and stories by status and other data**.
- **Epic:** EPIC-06
- **Priority:** Medium
- **Complexity:** Low
- **Background:** Asked for 2026-11-15 together with US-0603: "I would also like to add some filtering to epics and user stories based on status and other data."
- **Acceptance Criteria:**
  - [x] Filters for status (Planned, In progress, Done, Released, Deployed), release, epic, priority, complexity, and free text over the title and the story text.
  - [x] Filters combine; the count of matching stories shows, and one action clears them all.
  - [x] The filters start empty each time; nothing is remembered (decided 2026-11-16, replacing "remembered per project").
  - [x] Every text goes through `t()` in Swedish and English.
- **Notes:** Filters sit both above the epic list (one list of matching stories from every epic) and on each epic's page (intent `261115-story-filters`).
- **Dependencies:** US-0602 (release filter: US-0603)

**US-0605: Create a release by hand in the release list** ✅ Released in v0.2.7
- As a **developer planning what ships when**, in order to **plan a release before any story is marked for it**, I would like to **create a release myself in the release list and add stories to it there**.
- **Epic:** EPIC-06
- **Priority:** High
- **Complexity:** Medium
- **Background:** Asked for 2026-11-15: "we need to manually create Releases in that view. Right now there is no mechanism for that." Today a release exists only when a story carries "for vX.Y.Z" or a git tag `vX.Y.Z` exists. A story's release picker offers just the planned versions and the next patch and minor after the latest tag.
- **Acceptance Criteria:**
  - [x] **Given** the Releases delivery setting, **when** I choose "New release" in the release list, **then** I can enter a version `vX.Y.Z`. The next patch, minor and major after the latest tag are suggested, and a version that is not `vX.Y.Z` or already exists is refused with a message.
  - [x] **Given** I created a release, **then** it shows in the release list as planned with 0 stories, and it is offered in every story's release picker, also after the app restarts.
  - [x] **Given** a planned release, **when** I add stories to it from the release list, **then** each gets its "for vX.Y.Z" marker the same way as from the story (US-0603 FR2.2), and I can remove a story from it there too.
  - [x] **Given** a planned release with no stories and no tag, **then** I can delete it. A release with stories or a tag cannot be deleted.
  - [x] With Continuous deployment the action is hidden, as the rest of the release list is.
  - [x] Every text goes through `t()` in Swedish and English.
- **Notes:**
  - **Decided: where an empty release is kept.** One plan file per release in `docs/releases/X.Y.Z.md` (the folder the hand-written release plans already use); every plan file there counts as a release. "New release" creates a heading-only file, and only a heading-only file with no stories and no tag can be deleted. Stories are added one at a time (intent `261115-manual-releases`).
  - **Where.** `releaseOptions()` and `buildReleases()` in `src/main/parsers/releases.js`; the release list and picker in `src/renderer/FeaturesView.jsx`.
- **Dependencies:** US-0603

**US-0606: Release planning changes are committed on their own branch** 📋 Planned
- As a **developer planning releases in the app**, in order to **never find release planning left uncommitted on whatever branch is checked out**, I would like **the app to commit the change to a branch of its own whenever I add stories to a release, remove them, or create a release**.
- **Epic:** EPIC-06
- **Priority:** High
- **Complexity:** Medium
- **Background:** Asked for 2026-11-16, after the v0.2.8 release. US-0412, US-0508 and US-0804 had been added to v0.2.9 from the release list. That wrote "for v0.2.9" into the epic files and `FEATURES.md` but committed nothing, and `docs/releases/0.2.9.md` did not list them. The changes sat uncommitted on `main` until they were noticed and committed by hand (`40d03b5`). The team's rule lets docs go straight to `main`, but changes nobody committed are easy to lose, or to sweep into an unrelated commit.
- **Acceptance Criteria:**
  - [ ] **Given** I add one or more stories to a release, remove a story from one, or create a release in the release list, **then** the app commits every file it changed (the story markers, the epic `**Status (…)**` lines, the `FEATURES.md` rows and `docs/releases/X.Y.Z.md`) in one commit on the branch `docs/release-vX.Y.Z`. Adding several stories in a row adds to that same branch.
  - [ ] The commit is made in a temporary worktree from `origin/main`, so the checked-out branch and its uncommitted files are never touched or switched. If the checkout is already on `docs/release-vX.Y.Z`, the commit is made there.
  - [ ] **Given** stories are added to a release, **then** `docs/releases/X.Y.Z.md` lists them in its slice table, with epic, title, priority, complexity and dependencies taken from the story, in the same commit.
  - [ ] **Given** the branch has commits that are not on `main`, **then** the release list says so and offers to push it and open a pull request, typed into the shell tab without Enter, the way the GitHub panel does. The app pushes nothing by itself.
  - [ ] **Given** the commit fails (no git, a conflict, a hook refusing), **then** the app names the reason and the files, and keeps the change in the working tree as today instead of losing it.
  - [ ] A test proves that the current checkout's branch, index and working tree are unchanged after a release change.
  - [ ] Every text goes through `t()` in Swedish and English, and the view follows the LCARS look.
- **Notes:** The release markers are written in `src/main/releases.js` and `src/main/parsers/releases.js`, and the release list is in `src/renderer/FeaturesView.jsx` (US-0603, US-0605). The temporary-worktree pattern matches how planning docs are already committed by hand while a story branch is checked out. Commit subject: `docs: plan US-XXXX[, …] for vX.Y.Z`.
- **Dependencies:** US-0603, US-0605

**US-0607: Release planning is kept locally and pushed to GitHub when there is time** 📋 Planned
- As a **developer planning releases in the app**, in order to **never lose a planning change I made**, I would like **the app to keep each release planning action in a local record of its own, and to push the committed changes to GitHub at intervals or when nothing else is running**.
- **Epic:** EPIC-06
- **Priority:** High
- **Complexity:** Medium
- **Background:** Asked for on 2026-11-17. The person took US-0702, US-0412, US-0508 and US-0804 out of v0.2.9 from the release list. The change sat uncommitted in the working tree, was taken for a stray edit, and was discarded (`git checkout`), so it had to be redone by hand. US-0606 commits such changes on a branch of their own but pushes nothing. This story adds a record that survives a discarded working tree, and the push.
- **Acceptance Criteria:**
  - [ ] **Given** I add a story to a release, remove one, or create a release, **then** the app first writes the action (what, which stories, which release, when) to a local record outside the working tree, in the app's own data folder per project, before it changes any file.
  - [ ] **Given** an action in the record whose change is not on `origin/main` and not in the working tree (for example after a discarded working tree or a branch switch), **then** the app applies it again and says so, instead of losing it.
  - [ ] Committed planning changes (US-0606) are pushed at an interval the person sets (default 10 minutes), or sooner when the app is idle: no agent running, nothing waiting for an answer, and online.
  - [ ] A planning commit holds only docs, so it is pushed straight to `main`, as the team's rule allows. When `main` has moved, the app rebases its own commit in its temporary worktree first. On a conflict it pushes nothing, keeps the record, and names the files.
  - [ ] An action leaves the record only once its commit is on `origin/main`.
  - [ ] The release list shows actions not yet pushed ("2 planning changes waiting to be pushed"), with a button to push now.
  - [ ] Offline, or when `git push` is refused, the app keeps the record and tries again at the next interval, without a new dialog each time.
  - [ ] A test proves that a planning action survives `git checkout -- <files>` of the working tree and is applied again.
  - [ ] Every text goes through `t()` in Swedish and English, and the view follows the LCARS look.
- **Notes:** This changes US-0606's "the app pushes nothing by itself" and its branch-and-pull-request flow: planning commits go to `main`. Open: whether the person wants a pull request instead after all, as US-0606 proposed (proposal: straight to `main`, as for other docs).
- **Dependencies:** US-0606
