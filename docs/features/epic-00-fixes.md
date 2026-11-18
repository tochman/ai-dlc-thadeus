# EPIC-00: Fixes — things that work, but not well enough

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Small fixes the person reports while using the app: something looks off, behaves wrongly or is missing a detail. Each fix becomes a story here, so nothing reported in passing gets lost. A fix that grows into a feature moves to its topic's epic.

**Stories:** US-0001, US-0002, US-0003, US-0004, US-0005, US-0006, US-0007, US-0008, US-0009, US-0010, US-0011, US-0012, US-0013, US-0014, US-0015, US-0016, US-0017, US-0018, US-0019, US-0020, US-0021, US-0022, US-0023, US-0024, US-0025, US-0026, US-0027, US-0028

**Status (2026-11-18):** ✅ US-0001–US-0020 released (v0.2.3–v0.2.6). ✅ US-0021–US-0023 released in v0.2.7. ✅ US-0024 released in v0.2.8. ✅ US-0025 released in v0.2.9. ✅ US-0026 released in v0.2.9. ✅ US-0027 released in v0.2.9. 📋 US-0028 planned, no release yet, for v0.3.0. Each story names its release.

---

## User Stories

**US-0001: An epic only shows Done when all its stories are done** ✅ Released in v0.2.3 (intent `261114-intent-0-2-3-release`)
- As a **developer reading the Features view**, in order to **trust the badges**, I would like to **see an epic as Done only when every story in it is done**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Low
- **Background:** Reported 2026-11-14: "the features show done badge even with still planned stories in them". The overview took the first status marker in the epic's FEATURES.md row.
- **Acceptance Criteria:**
  - [x] Given a row with ✅ and 📋 (or 🚧) stories, the badge says In progress.
  - [x] Given only ✅ stories, it says Done; only 📋, Planned; no marker, no badge.
- **Notes:** `epicStatusOf()` in `src/main/parsers/features.js`, tests in `tests/main/features.test.js`.
- **Dependencies:** EPIC-06

**US-0002: A working agent tab lines up with the blocks and bar around it** ✅ Released in v0.2.3 (intent `261114-intent-0-2-3-release`)
- As a **developer who wants a pixel-perfect console**, in order to **not see edges jump while the agent works**, I would like to **have the busy agent tab keep the same edges as the SHELL block under it and the bar beside it**.
- **Epic:** EPIC-00
- **Priority:** Medium
- **Complexity:** Low
- **Background:** Reported 2026-11-14 with screenshots. The breathing glow drew a 1px ring outside the tab, so while WORKING it looked 1px left of SHELL and 1px above the bar.
- **Acceptance Criteria:**
  - [x] Given an agent tab in WORKING, its glow ring is drawn inside the block. Its left edge matches the SHELL block's and its top matches the bar's.
  - [x] The same holds with Animationer set to Dämpad or Av.
- **Notes:** `lcars-breathe` and `.is-breathing` in `src/renderer/theme.css`, test in `tests/main/theme.test.js`.
- **Dependencies:** US-0402

**US-0003: The story lifecycle rule follows the app into every project and every harness** ✅ Released in v0.2.3 (intent `261114-intent-0-2-3-release`)
- As a **developer using feature docs in any project**, in order to **have every AI tool keep the stories current while the work runs**, I would like to **have the app save the full lifecycle rule in AI-DLC's memory when it sets up feature docs**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Low
- **Background:** Reported 2026-11-14: these settings "must follow the app if we work with a FEATURES.md and epic files, and also be known by opencode and not just Claude". The rule only existed in this repo's own memory, and the app's setup request only said "updated when built and released".
- **Acceptance Criteria:**
  - [x] When the app sets up feature docs, the agent is asked to save a project rule, through AI-DLC's own rule mechanism, with these parts:
    - a new story goes into its epic right away;
    - 🚧 In progress when work on it starts;
    - ✅ Done when it is built and approved;
    - "for vX.Y.Z" once the release is known, and "Released in vX.Y.Z" at the tag.
  - [x] The rule lands in the project's AI-DLC memory, which Claude Code, opencode and the other harnesses all load. Swedish and English.
- **Notes:** `features.prompt.rule` in the locales, test in `tests/renderer/featureDocsPrompt.test.jsx`.
- **Dependencies:** US-0601

**US-0004: An answer in the popup reaches the agent once, so no question is answered twice** ✅ Released in v0.2.3 (intent `261114-intent-0-2-3-release`)
- As a **developer answering AI-DLC's questions from the popup**, in order to **not answer the same question twice**, I would like to **have my answer in the popup reach the agent's question picker, and the popup close as soon as the agent has it**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Medium
- **Background:** Reported 2026-11-14: "the popups are NOT sending to Claude. I have to answer the same question twice." The popup sends the option's digit to the agent tab (US-0505). The digit misses when:
  - the picker shows several questions at once;
  - the options logged in the audit (`DECISION_RECORDED`) are worded or ordered differently from the picker's;
  - the agent tab has moved on to its "type something" field.

  The popup only closes on `QUESTION_ANSWERED`, so after a miss it stays open and the person answers again in the terminal.
- **Acceptance Criteria:**
  - [x] Given a question waiting in Claude Code's picker, when the person picks an option in the popup, then the picker receives that option, the agent records it, and the popup closes. It is not shown again.
  - [x] Given a picker with several questions, the popup sends one answer per question, or, when it cannot, offers only "Svara i Claude". (It offers only the terminal.)
  - [x] Given logged options that don't match the picker, the popup sends no digits. It offers "Svara i Claude" and says why in one sentence.
  - [x] After a send, the popup shows "Skickat". If no `QUESTION_ANSWERED` follows within 10 s, it says once that the answer may not have arrived, instead of asking again.
  - [x] With two harness tabs side by side (US-0803), the answer goes to the tab whose agent asked.
- **Notes:** The popup now reads the agent tab's screen and sends the picker's own key only when the picker shows exactly the logged options (`readPicker()` / `resolveAnswer()` in `src/renderer/picker.js`, `screenLines()` in `src/renderer/TerminalPanel.jsx`, `answer()` in `src/renderer/TerminalContext.jsx`). An own answer goes through the picker's "Type something" choice. Tests: `tests/renderer/picker.test.jsx`, `tests/renderer/TerminalPanel.test.jsx`, `tests/renderer/QuestionPopup.test.jsx`. The picker layout in the tests was written by hand; a check against Claude Code's real picker is still due. Part of the cause can sit in how AI-DLC logs a question (a summary of a batch instead of one row per question). That also belongs in an AI-DLC framework report. Followed up in US-0006, which rebuilt the tests on the real picker layout and fixed why answers still missed.
- **Dependencies:** US-0505, US-0803

**US-0005: Resume waits while the work is already running** ✅ Released in v0.2.3 (intent `261114-intent-0-2-3-release`)
- As a **developer whose agent is working on an intent**, in order to **not type `/aidlc` into a conversation that already runs it**, I would like to **have the Resume button under the intent and in the intent list stay disabled while the work is running**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Low
- **Background:** Reported 2026-11-14: "the Resume button under the intent and in the list is still active even if the intent is being actively worked on". The button only checked the last-used agent tab for "Arbetar". An agent that is idle while it waits at a question or gate counted as free, and so did another agent tab that was working.
- **Acceptance Criteria:**
  - [x] Given any agent tab in WORKING, both Resume buttons are disabled and say why.
  - [x] Given an agent waiting on a question or gate asked since the app started, with an agent tab still running, both buttons are disabled and say "{harness} väntar på ditt svar — svara i terminalen först".
  - [x] Given the question is answered or the agent tab has exited, the button is enabled again. A question left open since before the app started does not block it.
- **Notes:** `asking()` in `src/renderer/TerminalContext.jsx` (fed from the waiting questions in `App.jsx`), `workingReason()` in `src/renderer/ResumeButton.jsx`, test in `tests/renderer/ResumeButton.test.jsx`.
- **Dependencies:** US-0501, US-0505, US-0803

**US-0006: Popup answers reach Claude Code's real picker** ✅ Released in v0.2.4 (intent `261114-custom-plans`)
- As a **developer answering AI-DLC's questions from the popup**, in order to **answer once and move on**, I would like to **have the popup's answer actually land in Claude Code's question picker**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Medium
- **Background:** Reported 2026-11-14 after v0.2.3: "the us-0004 is NOT working. We can not update AIDLC answers or Claude answers." US-0004's notes say the picker layout in its tests was written by hand, and the check against Claude Code's real picker was still due.
- **Acceptance Criteria:**
  - [x] The cause is found in a real Claude Code session, and the picker text that session shows is captured as a test fixture. (Decided 2026-11-14: no live capture. The fixtures are transcribed from the person's screenshot of the real picker.)
  - [x] Given a waiting AI-DLC question and the same question in Claude Code's picker, when the person picks an option in the popup, then the picker receives it, AI-DLC records `QUESTION_ANSWERED`, and the popup closes.
  - [x] Given a picker with several questions, the popup answers each, or offers only "Svara i Claude" and says why. (It offers only the terminal: a batch's logged labels differ from the picker's own.)
  - [x] A test built on the captured picker text fails before the fix and passes after it.
- **Notes:** Two causes.
  - **Options that could never match.** Main read `Options` as a comma list only, so pipe lists, batch summaries (`Q1: … / …; Q2: …`) and labels with a description in parentheses never matched a picker label. Engine asks (`QUESTION_ASKED`: plan approval, scope confirmation) were not shown at all, and an answer could close the wrong question.
  - **A picker on screen that the popup did not see.** The popup read the scrolled viewport, not the live screen, so a picker taller than the 10–14-row terminal panel was missed. It did not wait for the picker to be drawn after the audit row, and it did not know the `□` header chip.
  - **Where.** `parseOptions()` and `pendingQuestions()` in `src/main/questions.js`; `readPicker()`, `resolveAnswer()` and `waitForAnswer()` in `src/renderer/picker.js`; `screenLines()` in `src/renderer/TerminalPanel.jsx`; `answer()` in `src/renderer/TerminalContext.jsx`.
  - **Tests.** Fixtures in `tests/fixtures/picker/`. Tests in `tests/renderer/picker.test.jsx`, `tests/renderer/pickerSmoke.test.jsx` (a real xterm `Terminal`), `tests/renderer/QuestionPopup.test.jsx` and `tests/main/questions.test.js`.
- **Dependencies:** US-0004

**US-0007: Resume stays disabled while an agent session is running the work** ✅ Released in v0.2.4 (intent `261114-custom-plans`)
- As a **developer whose agent is running an intent**, in order to **not be offered a Resume that would type into the running session**, I would like to **have every Resume button stay disabled while an agent session runs the work, even when the agent is quiet**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Low
- **Background:** Reported 2026-11-14, with a screenshot, and reported several times before: "we still see these buttons active while we work on an intent … it is confusing for the user". Both "Resume at Code Generation (step 5 of 8)" buttons were enabled while `custom-plans` was in flight and Claude ran it in the agent tab. `workingReason()` disabled them only while a tab was busy (output in the last 1.5 s) or a question was open (US-0005). While Claude waits on a background subagent or is between steps, the tab is quiet and no question is open, so Resume turned active.
- **Acceptance Criteria:**
  - [x] While any agent tab of the project is alive (not exited) and the project's active intent is in flight, every Resume button in that project is disabled: under the intent and in the intent list, for the active intent and for other intents. Its title says why: "{harness} kör {intent} — fortsätt i terminalen" / "{harness} is running {intent} — continue in the terminal".
  - [x] The buttons are enabled again when the agent tab exits, or when the active intent is parked or completed.
  - [x] The busy and asking reasons from US-0005 stay, and come first.
- **Notes:**
  - **Where.** `running()` in `src/renderer/TerminalContext.jsx` (any agent tab not exited) and `workingReason()` in `src/renderer/ResumeButton.jsx`. The project's active intent reaches both buttons as `activeIntent` (`ProjectView.jsx` → `IntentDetail.jsx`, and `IntentList.jsx`). The text is `intents.resume.running`.
  - **Tests.** `tests/renderer/ResumeButton.test.jsx` (4 new) and `tests/renderer/TerminalPanel.test.jsx`.
- **Dependencies:** US-0005

**US-0008: The token wave shows from the first reading** ✅ Released in v0.2.4 (intent `261114-custom-plans`)
- As a **developer watching agents work**, in order to **see the token rate in the live token view (US-0207)**, I would like to **see the waveform as soon as the view appears, and new readings at its right edge**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Low
- **Background:** Reported 2026-11-14 while checking the v0.2.4 build: "everything seem to be working on the 0.2.4 release but i do not see the token cosumption wave". The meters showed, the wave did not. `wavePoints()` placed reading *i* at *i*/119 of the width from the left: one reading is a polyline with one point, which draws nothing, and the next few readings sat in the first pixels on the left.
- **Acceptance Criteria:**
  - [x] With one reading, the wave is a flat line across the full width.
  - [x] The newest reading is always at the right edge; older ones run to the left, and the part before the first reading is the zero line.
  - [x] The rate, the 120-reading history and the animations setting work as in US-0207.
- **Notes:**
  - **Where.** `wavePoints()` in `src/renderer/TokenView.jsx`.
  - **Tests.** `tests/renderer/TokenView.test.jsx`.
- **Dependencies:** US-0207

**US-0009: Resume waits while an agent outside the app runs the work** ✅ Released in v0.2.4 (intent `261114-custom-plans`)
- As a **developer who runs AI-DLC in my own terminal**, in order to **not be offered a Resume that would start the work a second time**, I would like to **have every Resume button stay disabled while an agent outside the app is working on the active intent**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Low
- **Background:** Reported 2026-11-14 with a screenshot: "and i still see these buttons!!!". Both "Resume at Deployment Execution (step 8 of 8)" buttons were enabled while Claude Code ran `custom-plans` in the person's own terminal. US-0007 only sees the app's own agent tabs, so a session outside the app was invisible.
- **Acceptance Criteria:**
  - [x] While the active intent is in flight and AI-DLC wrote its audit log in the last 10 minutes, every Resume button in the project is disabled. Its title says why: "En agent utanför appen arbetar med {intent} — fortsätt där" / "An agent outside the app is working on {intent} — continue there".
  - [x] When the log has been quiet for 10 minutes, or the intent is parked or complete, the buttons are enabled again at the next refresh.
  - [x] The busy, asking and running reasons from US-0005 and US-0007 stay, and come first.
  - [x] A disabled Resume button looks disabled: both blocks turn grey like every other disabled block, and hovering does not brighten them. (Reported again 2026-11-14 at 14.55: the button was disabled but still amber, because `.resume-button` never had a disabled style.)
- **Notes:**
  - **Where.** `newestMtime()` in `src/main/projectAccess.js`, `activityAt` in `summarizeIntent()` (`src/main/projectService.js`), and `workingReason()` with `ELSEWHERE_MS` in `src/renderer/ResumeButton.jsx`. The text is `intents.resume.elsewhere`.
  - **Limit.** A step that writes nothing to the log for over 10 minutes can turn Resume on early. The button re-checks on the next refresh, not on a timer.
  - **Tests.** `tests/renderer/ResumeButton.test.jsx` (2 new).
- **Dependencies:** US-0007

**US-0010: Timing tests stop failing under a loaded suite** ✅ Released in v0.2.5 (intent `261114-agent-dialogs`)
- As a **developer running the whole suite**, in order to **trust a red run**, I would like to **have the wall-clock tests pass when the code meets its limits, even while the machine is busy**.
- **Epic:** EPIC-00
- **Priority:** Medium
- **Complexity:** Low
- **Background:** Found 2026-11-15 during US-0506 Code Generation: "the exact C6 Stop string ends within 100 ms" took 197 ms once in a full parallel run, and earlier `dialogScript` and `watcher` timing tests failed the same way. Each passed on rerun.
- **Acceptance Criteria:**
  - [x] The wall-clock tests in `dialogScript.test.js`, `dialogScriptReply.test.js` and `watcher.test.js` are retried up to twice.
  - [x] No limit changes: every attempt must still meet the full 100 ms, 300 ms or 2.5 s window.
- **Notes:**
  - **Where.** `retry: 2` on the `timed` helpers, the two C6 tests and the `watcher` describe blocks, and (added with US-0410) on the whole `scripts` project in `vitest.config.mjs`, so `agentHooksGuard.test.js` and every other real-time script test is covered.
  - **Limit.** A script that is really too slow still fails, three times in a row.
- **Dependencies:** US-0506

**US-0011: No false Mismatch on a stage built unit by unit** ✅ Released in v0.2.5 (intent `261114-agent-dialogs`)
- As a **developer reading the pipeline**, in order to **trust the Mismatch badge**, I would like to **see a stage whose Units were built in parallel shown as done, with its time, once every Unit is approved**.
- **Epic:** EPIC-00
- **Priority:** Medium
- **Complexity:** Low
- **Background:** Reported 2026-11-15: "I also see a mismatch badge on code-generation". `aidlc-state.md` marked Code Generation done; `runtime-graph.json` had it approved but with its times only on the five Units (`instances`), so the app read the stage as not started.
- **Acceptance Criteria:**
  - [x] A stage with no times of its own takes its start from the earliest Unit start, and its completion from the latest Unit end once every Unit is approved.
  - [x] With a Unit still open, the stage has no completion time; a stage with neither times nor Units is unchanged.
  - [x] Its duration shows from those times.
- **Notes:**
  - **Where.** `unitTimes()` in `src/main/parsers/runtimeGraph.js`.
  - **Tests.** `tests/main/parsers.test.js` (1 new).
- **Dependencies:** US-0506

**US-0012: One way to move between panels, and settings that look like the rest of the app** ✅ Released in v0.2.5
- As a **developer using the console every day**, in order to **find every setting in one place and move between panels the same way everywhere**, I would like to **have one navigation pattern and LCARS-styled settings**.
- **Epic:** EPIC-00
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Reported 2026-11-15: "I am not happy with how these views look … I need the navigation between panels to be consistent and cohesive", and "part of the interface elements are not very LCARS".
- **Acceptance Criteria:**
  - [x] A view's sections are picked in the left arm, indented under the view's block, in every view: Settings (Tools … About), Features (Epics | Releases) and Configuration.
  - [x] A project's settings are its Configuration view, with the sections Feature docs, Agent and AI-DLC (the last only in an AI-DLC project). ⚙ on the project block, the menu and Settings › Project all open it; the modal dialog is gone.
  - [x] Settings has no orange frame, no second title and no Close button; the header names the view, and any view block in the arm or Esc leaves it.
  - [x] Choices are LCARS blocks, text fields are LCARS bars, and checkboxes are LCARS pills. Quiet buttons are dark blocks, not outlines. Frames and cards are solid-colour elbows, with no hairline borders.
  - [x] The project notices at the top share one banner style: text on the left, actions on the right.
  - [x] With a view's sections open, the arm still shows every block.
  - [x] The fullscreen toggle is a small control in the header bar's light segment, like the quick commands in the terminal bar, not a large block; the segment turns steel while fullscreen is on.
- **Notes:**
  - **Where.** `src/renderer/ProjectSettingsView.jsx` (was `ProjectSettingsDialog.jsx`), `App.jsx` (`ArmSubtabs`), `ProjectView.jsx`, `FeaturesView.jsx`, `SettingsView.jsx`, `AgentHooksStrip.jsx`, `theme.css`.
  - **Checked** in the built app with screenshots of every view and settings section.
- **Dependencies:** US-0410, US-0603

**US-0013: The intent list and the detail count the same stages** ✅ Released in v0.2.6
- As a **developer reading an intent's progress**, in order to **trust the numbers**, I would like to **see the same count in the intent list and in the intent's detail**.
- **Epic:** EPIC-00
- **Priority:** Medium
- **Complexity:** Low
- **Background:** Reported 2026-11-15: "note the discrepancy here - the list says 7/8 but the panel says 8 of 8 are done" (intent `project-defaults`). Its Code Generation was skipped by a jump (`[S]`). The list counted it as a stage left to do, which gave 7/8 with a hollow dot; the detail left it out of its dots but said "Step 8 of 8".
- **Acceptance Criteria:**
  - [x] A stage skipped by a jump (`[S]`) is not counted among the stages to run, so the list's n/m, the detail's dots and its "Step n of m" agree (7/7 for `project-defaults`).
  - [x] The pipeline still shows the skipped stage, muted.
  - [x] An intent whose remaining stages were all skipped counts as finished.
- **Notes:**
  - **Where.** `mergePipeline()` in `src/main/parsers/pipeline.js`.
  - **Tests.** `tests/main/parsers.test.js` (1 new). The fixture's `[S]` observability-setup now leaves the totals one lower in two tests.
- **Dependencies:** US-0102, US-0103

**US-0014: The lifecycle rule prompt says how to replace an older rule** ✅ Released in v0.2.6
- As a **developer setting up or updating a project's feature docs**, in order to **have one story lifecycle rule, not two that drift apart**, I would like to **have the agent take out the older lifecycle rule when it saves the new one**.
- **Epic:** EPIC-00
- **Priority:** Medium
- **Complexity:** Low
- **Background:** Reported 2026-11-15. The prompt the app types asks the agent to save the rule through AI-DLC and to replace an older one, but AI-DLC's save command only adds rules. The agent saved the new rule and left the old one in place.
- **Acceptance Criteria:**
  - [x] Given a project whose memory files already hold a story lifecycle rule, when the person sends the app's rule prompt, then the prompt tells the agent to save the new rule through AI-DLC and delete the older line by hand, as the one direct edit allowed, and say which line it took out.
  - [x] The prompt says how to recognise the older rule: a `(story-lifecycle: …)` tag, or an older rule about the status markers.
  - [x] It holds for both delivery settings and both languages, and the prompt stays one line.
- **Notes:**
  - **Where.** `features.prompt.rule` and `features.prompt.ruleContinuous` in `src/shared/locales/en.json` and `sv.json`.
  - **Tests.** `tests/renderer/featureDocsPrompt.test.jsx` (2 new).
  - **This project.** The older Swedish lifecycle rule under `## Mandated` in `aidlc/spaces/default/memory/project.md` was taken out by hand. The new rule is saved under `## Corrections`.
- **Dependencies:** US-0603

**US-0015: The header shows the branch that is checked out now** ✅ Released in v0.2.6
- As a **developer switching branches in the terminal**, in order to **know which branch the app is showing me**, I would like to **see the current branch in the header, also after I switch outside the app**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Low
- **Background:** Reported 2026-11-15 with a screenshot: after `git switch main` in a terminal, the header still read `FIX/US-0014` while the views already showed `main`'s files, so the lifecycle rule notice looked wrong.
- **Acceptance Criteria:**
  - [x] **Given** the project is open, **when** the branch is switched outside the app, **then** the header shows the new branch within a few seconds, without reopening the project.
  - [x] **Given** a detached HEAD, **then** the header says so instead of showing an old branch name.
  - [x] The notices and views that read files from the project refresh with the branch.
- **Notes:**
  - **Where.** `watchGitHead()` in `src/main/ipc.js` watches `.git/HEAD` and sends `git:headChanged`; the header in `src/renderer/App.jsx` reads the branch again on it and shows `app.detached` for a detached HEAD.
  - **Views.** The feature docs, the lifecycle notice and the intents already reload from their own file watchers when a switch changes the files.
  - **Ceiling.** A project below the repo root, or opened from a worktree (where `.git` is a file), has no `.git/HEAD` to watch; its label stays as first read (`ponytail:` comment).
  - **Tests.** `tests/main/ipc.test.js` and `tests/renderer/AppShell.test.jsx` (1 new each).
- **Dependencies:** US-0502

**US-0016: An older lifecycle rule in other words counts as older, not missing** ✅ Released in v0.2.6
- As a **developer with an older story lifecycle rule in the project's memory**, in order to **be told the rule needs updating rather than that it is missing**, I would like to **have an untagged lifecycle rule recognised even when it does not use all three status markers**.
- **Epic:** EPIC-00
- **Priority:** Low
- **Complexity:** Low
- **Background:** Reported 2026-11-15. `main`'s `project.md` holds an untagged Swedish lifecycle rule with 🚧 and ✅ but no 📋, so the app said "no story lifecycle rule" instead of "out of date".
- **Acceptance Criteria:**
  - [x] **Given** an untagged rule that names 🚧 and ✅, **then** the status is 'older', and the notice says the rule is out of date.
  - [x] **Given** no lifecycle rule at all, **then** the status stays 'missing'.
- **Notes:**
  - **Where.** `ruleStatus()` in `src/main/parsers/releases.js`: an untagged rule now counts as 'older' when it names 🚧 and ✅; 📋 is no longer required. A memory file with no lifecycle markers at all stays 'missing'.
  - **Tests.** `tests/main/releases.test.js` (1 new).
- **Dependencies:** US-0603, US-0014

**US-0017: Only the first terminal tab has the LCARS bow** ✅ Released in v0.2.6
- As a **developer who turns on a second agent tool in a project**, in order to **see the terminal arm drawn as one LCARS frame**, I would like to **have the rounded bow only on the first tab, not on the second agent tab**.
- **Epic:** EPIC-00
- **Priority:** Medium
- **Complexity:** Low
- **Background:** Reported 2026-11-15 with a screenshot, right after switching opencode on: the arm beside the terminal showed CLAUDE with the bow, then OPENCODE with a bow of its own, then SHELL as a plain block. "There should be no bow if it is the second AI agent. Only the first one should have a bow."
- **Acceptance Criteria:**
  - [x] **Given** two agent tabs (for example Claude and opencode) and the shell tab, **then** only the first tab in the arm has the bow; the second agent tab and the shell tab are plain blocks.
  - [x] **Given** the second agent tab is the open one, **then** it gets the open colour but still no bow; the first tab keeps its bow.
  - [x] The same holds with Codex or Kiro as the second tool, and with one agent tab after the second tool is turned off again.
- **Notes:**
  - **Where.** `src/renderer/theme.css`: the bow and the taller block moved from `.term-tab--agent` to `.term-tab:first-child`, so every later tab is a plain block whatever its tool.
  - **Tests.** `tests/main/theme.test.js` (1 new).
- **Dependencies:** US-0801, US-0403

**US-0018: The latest agent message stays out of the way** ✅ Released in v0.2.6
- As a **developer with the terminal open**, in order to **keep the LCARS frame on screen**, I would like to **see the latest agent message only when the terminal is hidden, on one line above it**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Low
- **Background:** Reported 2026-11-15 with screenshots, in v0.2.5: the latest-message line (US-0506) sat below the frame in the bottom-left corner, wrapped word by word, and pushed the whole frame up and out of the window. "We need to be careful with the space… only show notifications like this if the terminal is hidden."
- **Acceptance Criteria:**
  - [x] **Given** the terminal is open, **then** the latest-message line is not shown; the terminal already shows the agent's reply.
  - [x] **Given** the terminal is hidden, **then** the line shows on one row across the frame, just above the hidden terminal, cut with an ellipsis when too long, and the frame keeps its size.
  - [x] **Given** no message yet, **then** nothing is shown (no "no message yet" line).
  - [x] **Given** the agent dialog holds one item, **then** it shows no Previous, position or Next; the separate "Message" label above the title is gone (the title already says it).
  - [x] The suite passes inside the app's own terminal and in a checkout where the app's hooks are installed.
- **Notes:**
  - **Where.** The line had no place in the app's grid and no styles, so it fell into a new row under the left arm. `src/renderer/LatestMessageStrip.jsx` reads the terminal's open state; `src/renderer/theme.css` gives it a `msg` row that is dropped when the line is not shown. `src/renderer/AgentDialog.jsx` pages only with more than one item.
  - **Tests.** `tests/renderer/LatestMessageStrip.test.jsx` (2 new, 1 changed), `tests/main/theme.test.js` (1 new), `tests/renderer/AgentDialog.test.jsx` (1 new), `AgentDialogReply.test.jsx`, `AppShell.test.jsx`. `tests/main/opencodePlugin.test.js` unsets the app's session variables for its no-session case; `tests/helpers/agentHooksFixtures.js` takes the app's own hook entries out of the repository copy.
- **Dependencies:** US-0506

**US-0019: No "two agents at once" notice under the terminal** ✅ Released in v0.2.6
- As a **developer with two agent tabs**, in order to **not be alarmed by a guess**, I would like to **have the "two agents are working at once" line removed**.
- **Epic:** EPIC-00
- **Priority:** Medium
- **Complexity:** Low
- **Background:** Reported 2026-11-15 with a screenshot: the line stayed under the terminal while only Claude worked. The app guesses "busy" from when a tab last printed, so a redraw in the idle opencode tab was enough. "It is confusing to the user."
- **Acceptance Criteria:**
  - [x] **Given** two agent tabs that both count as busy, **then** no notice shows and the terminal keeps its height.
- **Notes:**
  - **Where.** `src/renderer/TerminalPanel.jsx`: `useTwoBusyWarning` and the notice removed; the `terminal.twoAgents` text removed from both locales.
  - **Tests.** `tests/renderer/TerminalPanel.test.jsx` (1 changed).
- **Dependencies:** US-0803

**US-0020: A leaner agent dialog** ✅ Released in v0.2.6
- As a **developer getting the agent's messages in the app**, in order to **read and answer them at a glance**, I would like to **see less text and fewer controls, and have Send close the dialog**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Low
- **Background:** Reported 2026-11-15 with screenshots: every message showed its whole text, an answer field, Open the terminal and Close; choice names and descriptions ran together ("Tag v0.2.6 nowSet the tag…"); the title had an orange focus box. "Show less and have less options… the send button should close the dialog (animated) and we do not always need an input." Agreed in a dialog: as proposed.
- **Acceptance Criteria:**
  - [x] **Given** a message of several paragraphs, **then** only the last one shows, with Show all for the rest.
  - [x] **Given** a message whose last paragraph does not end with a question mark, **then** there is no answer field and no Send, only Close.
  - [x] **Given** a message that asks something, **when** the answer is sent and taken, **then** the dialog closes, folding shut with full motion.
  - [x] A message has no Open the terminal button; questions and permissions keep it as their way out.
  - [x] A choice's description stands on its own line under its name.
  - [x] The title has no focus box when the dialog opens.
- **Notes:**
  - **Where.** `src/renderer/ReplyPage.jsx` (`replyParts`, the field only for a question, `onSent`), `src/renderer/AgentDialog.jsx` (Send closes; Open the terminal only off messages), `src/renderer/theme.css` (choice description, title focus, the fold under full motion), `agentDialog.reply.showAll` in both locales.
  - **Tests.** `tests/renderer/AgentDialogReply.test.jsx` (6 new, 1 changed), `tests/main/theme.test.js` (3 new).
  - **Open.** A question answered in the terminal was still shown in the dialog once (19:3x, 2026-11-15); not reproduced yet, the answered hook should end it.
- **Dependencies:** US-0506, US-0018
---

**US-0021: Editing a plan keeps its copy for every harness** ✅ Released in v0.2.7
- As a **developer who uses both Claude Code and opencode in a project**, in order to **run my own plans from either harness**, I would like **an edit in the plan editor to keep the plan's copy for every harness, not only one**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Low
- **Background:** Reported 2026-11-15: after the person changed the ultra-express plan's depth to Standard in the plan editor, `.aidlc/scopes/aidlc-ultra-express.md` (opencode's copy) was gone, while `.claude/scopes/aidlc-ultra-express.md` came back with the new depth. "I worry that opencode plan was deleted… it is a bug in the plan editor." The copy was restored by hand.
- **Acceptance Criteria:**
  - [x] **Given** a project with more than one harness, **when** I save an edit to my own plan, **then** every harness that had a copy of it still has one, with the edit in it.
  - [x] **Given** a project with more than one harness, **when** I delete my own plan, **then** every harness's copy is removed and the plan list is rebuilt for each harness.
  - [x] A rebuild that fails for one harness says which harness, and the plan file itself keeps the edit.
  - [x] Every new text goes through `t()` in Swedish and English.
- **Notes:**
  - **Cause, as read in the code.** `applyPlanEdit()` in `src/main/plans.js` removes every harness copy (`removeHarnessCopies`), then runs `aidlc engine graph compile` once, which writes the copy only for the harness it runs as (here Claude Code). The other harnesses' copies stay deleted. `deletePlan()` recompiles the same way.
  - **Fix.** Saving, editing and deleting a plan now compile once per installed harness (each folder with AI-DLC's `tools/`), run with `AIDLC_HARNESS_DIR` set to that folder, which is how the AI-DLC runtime picks the harness it writes for. Saving had the same gap: the `visual-express` plan never reached opencode until this fix.
  - **Tests.** `tests/main/plans.test.js` (save, edit and delete compile for `.claude` and `.aidlc`; a failed compile names its harness).
- **Dependencies:** US-0903, US-0803

---

**US-0022: The token detail view opens in a narrow window too** ✅ Released in v0.2.7
- As a **developer working in a smaller app window**, in order to **see where the tokens go without making the window wider**, I would like to **open the token detail view at any window width**.
- **Epic:** EPIC-00
- **Priority:** Medium
- **Complexity:** Low
- **Background:** Found 2026-11-16 while building US-0208. The way into the token detail view is the small token view and the "Tokens ›" button in the intent's right column (`.readout-col`), which `theme.css` hides below 1280 px (`@media (max-width: 1280px) { .readout-col { display: none; } }`). In a narrower window the view cannot be opened at all.
- **Acceptance Criteria:**
  - [x] **Given** a window narrower than 1280 px, **when** I look at an intent, **then** there is a way to open the token detail view (for example a "Tokens" button in the intent header), reachable by keyboard.
  - [x] **Given** the token detail view open in a narrow window, **then** its right column stacks under the charts and nothing scrolls sideways.
  - [x] Every new text goes through `t()` in Swedish and English.
- **Notes:** **Fix.** A Tokens button in the intent header, shown only below 1280 px where the readout column hides; focus returns to whichever button opened the view. The view's right column already stacks under the charts below 900 px. **Tests.** `tests/renderer/TokenDetail.test.jsx`, `tests/main/theme.test.js`. **Where.** `src/renderer/IntentDetail.jsx`, `src/renderer/TokenDetail.jsx`, the `.readout-col` rule in `src/renderer/theme.css`.
- **Dependencies:** US-0208

---

**US-0023: Clear the npm audit warnings** ✅ Released in v0.2.7
- As a **maintainer of a public repository**, in order to **ship without known vulnerable packages**, I would like **`npm audit` to report no critical or moderate issues**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Low
- **Background:** Found 2026-11-16 while building US-0208: `npm audit` reports 8 issues, all with a fix available. Critical: `dompurify` (pulled in through `monaco-editor`). Moderate: `electron-builder` and its `app-builder-lib`, `dmg-builder`, `electron-builder-squirrel-windows`, `@electron/universal`, and `minimatch`. Low: `monaco-editor`.
- **Acceptance Criteria:**
  - [x] `npm audit` reports no critical or moderate issues; any low one left is named here with why.
  - [x] The app still builds the macOS `.dmg` and the Linux `.deb` in CI, and the editor (US-1001) still opens and saves files.
  - [x] The full test suite stays green.
- **Notes:** Try `npm audit fix` first; a major bump of `electron-builder` or `monaco-editor` needs its release notes read. Consider an `npm audit --audit-level=moderate` step in the CI `verify` job so new issues show up on every pull request.
- **Fix.** `npm audit fix` offered only downgrades (electron-builder 25.1.0, monaco-editor 0.56.0), so `package.json` pins the patched transitive versions with `overrides`: `dompurify` ^3.4.18 (five advisories up to 3.4.16, used by monaco-editor) and `minimatch` ^11.0.8 for the vulnerable 7–11.0.0 range (GHSA-g3hv-75wg-m249, used by electron-builder). `npm audit` now reports 0 vulnerabilities; the Mac app packages locally and CI builds both packages. An audit step in CI was not added.
- **Dependencies:** none

---

**US-0024: The "Tokens over time" chart is drawn** ✅ Released in v0.2.8
- As a **developer watching agents work**, in order to **see how the tokens build up over time**, I would like **the token detail view to draw the "Tokens over time" chart, not only its legend**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Low
- **Background:** Found 2026-11-16 on intent `261116-agent-progress`, Reverse Engineering running, Live, 6.3 M tokens, "0:08 · 12 readings". In the token detail view, "Tokens over time" with Diagram selected shows the switch and the legend (input, output, cache write 1 h and 5 m, cache read) but no chart; the per-stage, per-agent and per-model splits and the "Rate now" sparkline in the right column are drawn.
- **Acceptance Criteria:**
  - [x] **Given** an intent with two or more token readings, **when** I open the token detail view with Diagram selected, **then** the chart is drawn with one series per token kind and the figures behind it on hover or focus.
  - [x] **Given** fewer readings than a chart needs, **then** the view says so in one sentence instead of showing an empty area (US-0208's rule for missing data).
  - [x] A test fails without the fix and passes with it; the full suite stays green.
- **Notes:** Start from the root cause: the chart's data (readings in `.thadeus/tokens/`), its width (a zero-width container would draw nothing) or the Diagram branch in `src/renderer/TokenDetail.jsx` and `src/renderer/tokenChart.js`. Runs on the `quick-fix` plan.
- **Dependencies:** US-0208

---

**US-0025: Agent progress shows a running build when the inflight file is empty** ✅ Released in v0.2.9
- As a **developer watching agents work**, in order to **see that a build is running**, I would like **the "Agenternas framsteg" panel and "Arbetar nu" to show a running AI-DLC agent even when AI-DLC's inflight file is missing or empty**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Low
- **Background:** Reported 2026-11-16: a Code Generation developer agent was running in another project, but the panel said "Inga agenter arbetar i den här intenten just nu." Claude Code runs a small helper agent after every main turn (prompt suggestion); its SubagentStop makes AI-DLC log `SUBAGENT_COMPLETED` with `Agent Type: unknown` and clear the inflight entry, so `aidlc/.aidlc-subagent-inflight` was gone or held only another session's entry, and `workingAgents` showed nothing (or only the newest dispatch).
- **Acceptance Criteria:**
  - [x] **Given** an open `aidlc-developer-agent` dispatch in Code Generation and no inflight file, **when** I open the agent progress, **then** the build row shows.
  - [x] **Given** `SUBAGENT_COMPLETED` events with `Agent Type: unknown`, **then** they neither close nor hide a known agent's row.
  - [x] **Given** an older open dispatch of the same agent type in the same stage (refused or interrupted), **then** the later dispatch replaces it, and a completed stage drops its open dispatches and reviews.
  - [x] A test fails without the fix and passes with it; the full suite stays green.
- **Notes:** **Fix.** `workingAgents` reads the audit log alone and skips `unknown`; one open dispatch per agent type and stage (a `ponytail:` comment names the limit for parallel same-type agents). Open Unit builds and reviews still show only while the inflight file has entries. **Tests.** `tests/main/workingAgents.test.js` (with a trimmed real audit excerpt), `tests/main/agentProgress.test.js`. **Where.** `src/main/projectService.js`, `src/main/parsers/agentProgress.js`. An upstream fix belongs in AI-DLC's SubagentStop hook: ignore completions with no known agent type instead of clearing the inflight entry.
- **Dependencies:** US-0507, US-0901

---

**US-0026: The agent dialog is not left empty at a new session, and offers /clear or /clear + resume** ✅ Released in v0.2.9
- As a **developer starting a new Claude Code session**, in order to **carry on without a dead dialog in the way**, I would like **the agent dialog to show something I can act on at that moment: start a clean chat with `/clear`, or `/clear` and then `/aidlc --resume`**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Low
- **Background:** Reported 2026-11-17: when a new session starts, the agent dialog stays open with no text and no buttons, and the only way out is to close it. That is also the moment the person usually wants a fresh context (the cost rule: park, then resume in a fresh session), so the dialog can offer it.
- **Acceptance Criteria:**
  - [x] **Given** a new session starts while the agent dialog is open, **then** the dialog never shows a page with no text and no choices: an event with nothing to show closes its page (or the dialog when it was the last one).
  - [x] **Given** a Claude Code project at a new session (or a parked workflow), **when** the dialog offers the next step, **then** it has two choices: "/clear" (sends `/clear` to the session's terminal) and "/clear + /aidlc --resume" (sends `/clear`, waits until the new session is ready, then sends `/aidlc --resume`).
  - [x] **Given** a harness other than Claude Code, **then** the choices are not shown (or use that harness's own commands).
  - [ ] Both choices are reachable by keyboard, LCARS look, and every text goes through `t()` in Swedish and English.
  - [x] A test fails without the fix and passes with it; the full suite stays green.
- **Notes:** Start from the root cause: which event opens the empty page (a SessionStart or `ended` hook event with no questions, see `statusOf` and `HookPage` in `src/renderer/AgentDialog.jsx` and the states in `src/main/agentPermissions.js` / `src/main/agentEvents.js`). Send the commands through the existing terminal path (`TerminalContext`). Runs on the `quick-fix` plan.
- **Implementation (Code Generation, 2026-11-17, built with US-0213):** The empty page was a reply with no visible text: a `Stop` (or an opencode idle) whose last message is empty, whitespace or only invisible characters became a shown reply with no text and no choices, and opened the dialog. `agentReplies.js` now opens no page for it (an older reply of the tab still moves on), so every caller is covered. The new-session page comes from THADEUS's `SessionStart` entry (source `startup` or `resume`, with an intent open) and offers `/clear` and `/clear + /aidlc --resume`; opencode uses `/new`; other harnesses get no page.
- **Build and Test (2026-11-17, intent `261117-session-handoff-dialog`):** the regression test in `tests/main/agentEventsReply.test.js` fails without the fix and passes with it; 1796/1796 tests. The LCARS look of the page is checked by eye in the running app before the v0.2.9 tag.
- **Dependencies:** US-0506

**US-0027: The app follows the repository's new name, ai-dlc-thadeus** ✅ Released in v0.2.9
- As a **developer using THADEUS**, in order to **keep getting updates and reach the right GitHub pages**, I would like **the app to use the repository's new name, `tochman/ai-dlc-thadeus`**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Low
- **Background:** Reported 2026-11-17: the repository was renamed from `tochman/aidlc-dash` to `tochman/ai-dlc-thadeus`. GitHub forwards the old address, but the updater compares each release file's address with `https://github.com/tochman/aidlc-dash/releases/download/<tag>/<name>` as text (`assertOwnAsset`, `src/main/updater.js`). GitHub now returns the new name, so every installed copy up to v0.2.8 refuses every update as "not this repository's own file". Installed copies cannot be fixed from here: they must download v0.2.9 by hand once.
- **Acceptance Criteria:**
  - [x] **Given** a release of `tochman/ai-dlc-thadeus`, **when** the app checks for updates, **then** it accepts that repository's own release files and still refuses any other repository's.
  - [x] The repository name is defined once and used by the updater (`REPO`), the Issues link (`src/main/menu.js`), the repository link (`src/main/ipc.js`), `package.json` `homepage` and `README.md`. No `tochman/aidlc-dash` address is left in the app or its tests.
  - [x] The old package and settings-folder names stay: `aidlc-dash` in `electron-builder.yml` (`--replaces`, `--conflicts`) and the `userData` folder in `src/main/index.js`. These are names, not addresses.
  - [x] The v0.2.9 release notes tell users on v0.2.8 or earlier to download v0.2.9 by hand once, because their copy cannot update itself across the rename.
  - [x] A test fails without the fix and passes with it; the full suite stays green.
- **Notes:** Runs on the `quick-fix` plan, after the US-0213/US-0026 intent. The local git remote was already pointed at the new address on 2026-11-17.
- **Done (2026-11-17, without AI-DLC, branch `fix/US-0027`):** `APP_REPO` and `APP_REPO_URL` in `src/shared/appName.js` are the one place the repository is named. The updater (`REPO`), the Issues link, the About links, `package.json` and the README use them. `tests/main/appName.test.js` fails while any `tochman/aidlc-dash` address is left under `src/`, in `package.json` or in the README. The download-by-hand note for v0.2.8 and earlier is on the v0.2.9 release checklist (`docs/releases/0.2.9.md`). 1797/1797 tests pass.
- **Dependencies:** US-0407, US-0413 (the updater)

**US-0028: The pipeline view does not warn about a missing runtime-graph.json that is expected** 📋 Planned, for v0.3.0
- As a **developer watching an intent in the pipeline view**, in order to **tell a real problem from a normal state**, I would like **the view to show no warning-like note when runtime-graph.json is simply not there yet, and a calm one when it cannot be there**.
- **Epic:** EPIC-00
- **Priority:** Low
- **Complexity:** Low
- **Background:** Reported 2026-11-18. The pipeline view kept saying "runtime-graph.json is missing (it is git-ignored). Status comes from aidlc-state.md." (`pipeline.noGraph`, `src/renderer/Pipeline.jsx`). The note is shown for any intent without the file (`hasGraph` false). That fits two normal cases. A new intent has no file yet, because AI-DLC writes it once the workflow records stage timings; this happened for `261118-release-0-2-9`. An intent from another clone never has the file, because it is git-ignored and stays on the machine that made it. In both cases the status read from `aidlc-state.md` is correct; only timings and the Unit graph are missing.
- **Acceptance Criteria:**
  - [ ] **Given** an intent with no runtime-graph.json and no completed stage, **when** I open its pipeline view, **then** no note about the file is shown.
  - [ ] **Given** an intent with no runtime-graph.json and at least one completed stage (for example one made on another machine), **when** I open its pipeline view, **then** it shows one calm sentence that timings are kept only on the machine that ran the work, not a warning.
  - [ ] **Given** a runtime-graph.json that exists but cannot be read, **then** the view still warns, as today (`buildDetail` warnings).
  - [ ] Every text goes through `t()` in Swedish and English, in the LCARS look.
  - [ ] A test fails without the fix and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan. Touches `src/renderer/Pipeline.jsx` and the `pipeline.noGraph` keys in `sv.json` and `en.json`.
- **Dependencies:** none
