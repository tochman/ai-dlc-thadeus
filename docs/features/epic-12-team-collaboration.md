# EPIC-12: Team Collaboration — use git and AI-DLC so a team can work in the app together

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> The app is built for one person at one machine today. The GitHub panel (US-0502) brings in other people's AI-DLC work and helps with conflicts, but it does not show who is working on what. Asked for 2026-11-15: "think about how we can make team collaboration better in this application. I have no real concept about it yet, but we need to make sure we leverage the power of git as well as AI-DLC to enhance the value of this application for teams." This epic starts with a review and a concept; the stories that build it come out of that.

**Stories:** US-1201, US-1202, US-1203

**Status (2026-11-22):** ✅ US-1201 and US-1202 released in v0.2.8 (US-1202 is built inside US-1201). ✅ US-1203 released in v0.2.14. Each story names its release.

---

## User Stories

**US-1201: Review the GitHub panel and shape a team collaboration concept** ✅ Released in v0.2.8
- As a **developer working on a project with a team**, in order to **see and coordinate what everyone is doing without leaving the app**, I would like to **have the GitHub panel reviewed and a concept for team collaboration worked out, built on git and AI-DLC**.
- **Epic:** EPIC-12
- **Priority:** High
- **Complexity:** Large (a review and a concept, then the build of backlog items 1–5 of the approved concept, with US-1202 merged in)
- **Background:** Asked for 2026-11-15, for v0.3.0. There is no concept yet, so this story is discovery: its result is a concept the person approves and the stories that build it.
- **Acceptance Criteria:**
  - [x] **Given** the GitHub panel as it is today (`src/renderer/RefreshPanel.jsx`), **then** a review lists what it does well, what is missing or confusing, and what should change, with screenshots or concrete examples.
  - [x] **Changed 2026-11-16 by the person, from a concept to a build.** The concept was worked out and approved in the intent's ideation stages (`261116-team-collab-concept`: intent statement, scope document, intent backlog, initiative brief). Instead of ending with new stories, all five backlog items are built here, with US-1202 merged in. The original concept criteria were:
    - **Given** what git already gives a team (branches, pull requests, reviews, tags, history, who committed what), **then** the concept names which of these the app should show or drive, and which it should leave to GitHub.
    - **Given** what AI-DLC already gives a team (shared memory in `team.md` and `project.md`, per-clone audit shards, one intent per piece of work, spaces, team-owned Units and the team board in Construction), **then** the concept names how the app uses each one, or why it does not.
    - The concept answers at least: who is working on which intent and story right now; how a teammate's approvals, reviews and open questions reach the others; how two people avoid working on the same story; and how a new team member gets started in the project.
    - The concept is written up in this epic, with the questions left open, and the person approves it before any build story starts.
    - It ends with new stories in this epic (or in the topic's own epic), each with acceptance criteria and a release, in v0.2.9 or later (v0.3.0 is kept for a larger release).
  - [x] **Platform connection:** pull requests, reviews and comments from GitHub (`gh`), GitLab (`glab`) and Bitbucket (REST, app password in the OS keychain via `safeStorage`), behind one interface, with named errors and a 15 s timeout.
  - [x] **Collision warning:** see US-1202.
  - [x] **Who works on what across my machines:** a "Datorer" sub-tab under the Github block shows each intent's machines (from the audit shard names) and remote story branches, and flags the same story on two machines or branches.
  - [x] **Comments per story:** a "Kommentarer" tab in the intent view joins the story's pull request comments and reviews with AI-DLC's open questions, approvals and review findings.
  - [x] **GitHub panel:** reviewed below; it is named after the `origin` platform and shows the collision warning.
  - [x] LCARS look, the shared Tooltip, and every text through `t()` in Swedish and English.
- **Notes:**
  - **How to run it.** A good fit for an AI-DLC workflow with ideation stages (intent capture, scope), since the problem is still open.
  - **Related.** US-0502 (the GitHub panel), US-0507 (what the agents are doing), US-0804 (signing in to each tool), US-1101 (a public repository and outside contributors), US-0605 (planning releases together).
- **Review of the GitHub panel (2026-11-16).** The panel is `src/renderer/RefreshPanel.jsx`, opened from the "Github" block in the left arm.
  - **What it does well.**
    - It only reads. `git fetch` runs when you press Update and at no other time, and the local status shows before any fetch.
    - It splits what is new under `aidlc/` from the rest, counts the new audit lines, and lists intents that exist only on the remote.
    - A remote file under `aidlc/` opens read-only from git objects, without touching the working tree.
    - Pull, rebase and merge are typed into the shell tab without Enter, with a sentence on what each does. They are disabled while AI-DLC works.
    - Conflicts in `intents.json` and `aidlc-state.md` get a line of help each.
  - **What is missing or confusing.**
    - The name says GitHub, but the panel only uses plain git. On a GitLab or Bitbucket remote the name is wrong, and on GitHub it shows nothing of GitHub: no pull requests, reviews or comments.
    - "Ahead / behind" compares with the branch's own upstream. A story branch that is level with its upstream but 12 commits behind `origin/main` looks up to date. Nothing says that the tests should run again after main is merged in.
    - Nothing says that another open pull request changes the same files. "Show conflicts" only lists conflicts after a merge has already gone wrong.
    - The two abort buttons show whatever operation is in progress, and the "N new" badge counts only commits under `aidlc/`.
  - **What changes (in this story).**
    - The panel is named after the `origin` remote: "Update from GitHub", "Update from GitLab" or "Update from Bitbucket".
    - A collision warning (US-1202) shows how far the branch is behind `origin/main`, the open pull requests that change the same files, and the files that would conflict, from `git merge-tree` without touching the working tree.
    - After a merge that went wrong, a button opens the intent's `test-results.md` in the editor with an "Efter merge med main" section to fill in.
    - The rule stays: every command that changes the working tree is typed into the shell tab without Enter.
  - **Left for later.** One abort button for the operation in progress, and a badge that counts every new commit.
- **Dependencies:** US-0502

**US-1202: Warn when a story's branch is behind main or collides with another open pull request** ✅ Released in v0.2.8 (merged into US-1201 and built with it)
- As a **developer who runs more than one story at a time**, in order to **find out before I approve and merge that a story that was "done" no longer fits with main**, I would like **the app to warn me when a story's branch is behind `main` or touches the same files as another open pull request, and to help me write down what the merge turned up**.
- **Epic:** EPIC-12
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-16, after US-0209 (#58) and US-0414 (#59) were both built in parallel from the same `main`. Each was green on its own branch. When #58 merged first, #59 conflicted in the code knowledge base, `intents.json` and a test file both had created. US-0209 had also added a native `title=` that US-0414's guard test rejects. The person wants this caught before the "done" is trusted, and documented in the intent when it happens. The project rule (`aidlc/spaces/default/memory/project.md`, Way of Working) now asks for this by hand; this story makes the app help.
- **Acceptance Criteria:**
  - [x] **Given** an intent whose story branch is behind `origin/main`, **when** I look at the intent, **then** the app says how many commits behind it is and that the tests should run again after main is merged in.
  - [x] **Given** two open pull requests that change the same files, **when** I look at either intent, **then** the app names the other pull request and the shared files, and says which files would conflict (from `git merge-tree`, without changing the working tree).
  - [x] The check runs on the app's own read-only git calls and does not fetch, merge or push by itself; a refresh button runs `git fetch` only when I press it.
  - [x] **Given** a merge that turned up conflicts or failures after the story was approved, **when** I choose to record it, **then** the app opens the intent's `construction/build-and-test/test-results.md` in the editor with an "Efter merge med main" section ready to fill in (what was wrong, cause, fix and commit, new results, lesson). It writes nothing else under `aidlc/`.
  - [x] Every text goes through `t()` in Swedish and English.
- **Notes:** Shape it together with the US-1201 concept (who works on what; how two people avoid the same story). The audit `Recovery:` note stays an AI-DLC command (`aidlc engine audit append-raw`), which the app may offer to type into the terminal but never writes itself.
- **Dependencies:** US-0502, US-1201

---

**US-1203: The intent's Comments tab shows what needs attention, and why it matters** ✅ Released in v0.2.14
- As a **developer following an intent**, in order to **see at once what needs me and what reviewers said**, I would like **the Comments tab to lead with what waits on me, show the pull request's review as a conversation, and say plainly what it shows and why it is empty**.
- **Epic:** EPIC-12
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-22: the person "struggles to understand what it displays and the value of the data displayed". Today (`src/renderer/StoryComments.jsx`, US-1201 AC-4) the tab lists, oldest first and all alike, the comments and reviews of the story's pull request (found by the story number in its branch or title) together with AI-DLC's open questions, approvals and review findings. With no matching pull request it shows one line ("No open pull request has the story number in its branch or title. The rows below are AI-DLC's.") and then rows such as "APPROVAL · macbookpro · Approved Requirements Analysis", which the Timeline tab already shows.
- **Acceptance Criteria:**
  - [x] The tab is named for what it holds ("Review" / "Granskning"), with a one-line description under its title.
  - [x] **Needs you** comes first: AI-DLC questions waiting for an answer, review findings marked NOT-READY, the pull request's change requests and unresolved threads; each row says what to do and opens the right place (the agent dialog, or the comment on GitHub). With nothing waiting, it says so in one line.
  - [x] **Pull request**: its number, state and reviewers as a readout, then the review comments grouped by thread (file and line when there is one), newest thread first, resolved threads folded.
  - [x] Approvals are not repeated here; they stay in Timeline.
  - [x] **Given** no pull request matches, **then** the tab says which story number it looked for and how to link a pull request (the number in its branch or title), instead of a bare sentence.
  - [x] It follows the LCARS language of US-0417 (readout rows with state strips, pills for actions); every text goes through `t()` in `sv.json` and `en.json`.
  - [x] A test fails without the change and passes with it; the existing suite stays green.
- **Notes:** Content and look; the data sources (`gh`/`glab`/Bitbucket, the audit log) stay as they are.
- **Dependencies:** US-1201, US-0417

