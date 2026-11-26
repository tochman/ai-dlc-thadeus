# EPIC-00: Fixes — things that work, but not well enough

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Small fixes the person reports while using the app: something looks off, behaves wrongly or is missing a detail. Each fix becomes a story here, so nothing reported in passing gets lost. A fix that grows into a feature moves to its topic's epic.

**Stories:** US-0001, US-0002, US-0003, US-0004, US-0005, US-0006, US-0007, US-0008, US-0009, US-0010, US-0011, US-0012, US-0013, US-0014, US-0015, US-0016, US-0017, US-0018, US-0019, US-0020, US-0021, US-0022, US-0023, US-0024, US-0025, US-0026, US-0027, US-0028, US-0029, US-0030, US-0031, US-0032, US-0033, US-0034, US-0035, US-0036, US-0037, US-0038, US-0039, US-0040, US-0041, US-0042, US-0043, US-0044, US-0045, US-0046, US-0047, US-0048, US-0049, US-0050, US-0051, US-0052, US-0053

**Status (2026-11-26):** ✅ US-0001–US-0020 released (v0.2.3–v0.2.6). ✅ US-0021–US-0023 released in v0.2.7. ✅ US-0024 released in v0.2.8. ✅ US-0025 released in v0.2.9. ✅ US-0026 released in v0.2.9. ✅ US-0027 released in v0.2.9. ✅ US-0028 released in v0.2.10. ✅ US-0029 released in v0.2.10. ✅ US-0030 released in v0.2.10. ✅ US-0031 released in v0.2.10. ✅ US-0032 released in v0.2.11. ✅ US-0033 released in v0.2.11. ✅ US-0034 released in v0.2.12. ✅ US-0035 and US-0036 released in v0.2.13. ✅ US-0037, US-0038, US-0039, US-0040, US-0041 and US-0042 released in v0.2.14. ✅ US-0043 released in v0.2.15. ✅ US-0044 released in v0.2.15. ✅ US-0045 released in v0.2.15. ✅ US-0046 released in v0.2.15. ✅ US-0047 released in v0.3.0. ✅ US-0048 released in v0.3.0. ✅ US-0049 released in v0.3.0. 📋 US-0050 planned, for v0.3.1. ✅ US-0051, US-0052 and US-0053 done, for v0.3.1. Each story names its release.

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

**US-0028: The pipeline view does not warn about a missing runtime-graph.json that is expected** ✅ Released in v0.2.10
- As a **developer watching an intent in the pipeline view**, in order to **tell a real problem from a normal state**, I would like **the view to show no warning-like note when runtime-graph.json is simply not there yet, and a calm one when it cannot be there**.
- **Epic:** EPIC-00
- **Priority:** Low
- **Complexity:** Low
- **Background:** Reported 2026-11-18. The pipeline view kept saying "runtime-graph.json is missing (it is git-ignored). Status comes from aidlc-state.md." (`pipeline.noGraph`, `src/renderer/Pipeline.jsx`). The note is shown for any intent without the file (`hasGraph` false). That fits two normal cases. A new intent has no file yet, because AI-DLC writes it once the workflow records stage timings; this happened for `261118-release-0-2-9`. An intent from another clone never has the file, because it is git-ignored and stays on the machine that made it. In both cases the status read from `aidlc-state.md` is correct; only timings and the Unit graph are missing.
- **Acceptance Criteria:**
  - [x] **Given** an intent with no runtime-graph.json and no completed stage, **when** I open its pipeline view, **then** no note about the file is shown.
  - [x] **Given** an intent with no runtime-graph.json and at least one completed stage (for example one made on another machine), **when** I open its pipeline view, **then** it shows one calm sentence that timings are kept only on the machine that ran the work, not a warning.
  - [x] **Given** a runtime-graph.json that exists but cannot be read, **then** the view still warns, as today (`buildDetail` warnings).
  - [x] Every text goes through `t()` in Swedish and English, in the LCARS look.
  - [x] A test fails without the fix and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan. Touches `src/renderer/Pipeline.jsx` and the `pipeline.noGraph` keys in `sv.json` and `en.json`.
- **Done (2026-11-18, quick-fix workflow `261118-calm-pipeline-note`, branch `fix/US-0028`):** `Pipeline.jsx` shows the `pipeline.noGraph` note only when runtime-graph.json is missing and at least one stage is done (`data-testid="pipeline-timings-note"`), with the new calm text in Swedish and English. The unreadable-file warning from `buildDetail` is unchanged. Three new tests in `tests/renderer/Pipeline.test.jsx`; 1882/1882 tests pass, 92.3% line coverage.
- **Dependencies:** none

**US-0029: Moving a story to another release leaves its row in the old release plan** ✅ Released in v0.2.10 (intent `261118-release-row-move`)
- As a **developer planning releases in the app**, in order to **trust the release plan files**, I would like **a story moved to another release to leave the old release's plan file**.
- **Epic:** EPIC-00
- **Priority:** Low
- **Complexity:** Low
- **Background:** Reported 2026-11-18. US-0028, US-0215 and US-0805 were moved from v0.3.0 to v0.2.10. The release list showed v0.3.0 as empty, because it reads each story's "for vX.Y.Z" note, but `docs/releases/0.3.0.md` still listed all three. `writePlanRow` in `src/main/releases.js` adds the row to the new release's plan file and never removes it from the old one. The stale rows were removed by hand.
- **Acceptance Criteria:**
  - [x] **Given** a story listed in one release's plan file, **when** I move it to another release, **then** its row is removed from the old file and added to the new one.
  - [x] **Given** the old file then holds no rows, **then** it is left as the heading only, as a new release is created.
  - [x] A file changed since it was read is not overwritten (the existing hash check).
  - [x] A test fails without the fix and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan. Touches `writePlanRow` and `addPlanRows` in `src/main/releases.js` and `src/main/parsers/releases.js`.
- **Done (2026-11-18, quick-fix, branch `fix/US-0029`):** `setStoryRelease` reads the story's old release, and the new `dropPlanRow` takes its row out of that release's plan file through `removePlanRows` (`src/main/parsers/releases.js`) with the hash check. Removing a story from a release still leaves its row. 1883/1883 tests pass.
- **Dependencies:** US-0606

**US-0030: Agent progress keeps an old state and is vague about what an agent is doing** ✅ Released in v0.2.10 (intent `261118-honest-agent-progress`)
- As a **developer watching an intent while agents work**, in order to **know what is happening without reading the terminal**, I would like **each agent row in Agent progress to show its task, its step in the plan, and what it is doing right now, and the main row to show its real state**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Medium
- **Background:** Reported 2026-11-18 during US-0215's Code Generation. The token view's Agent progress showed "Main · Claude Code — waiting for your permission (5 min)" while main was waiting for a background agent, with no permission prompt open. The developer row said only "developer — running Bash (0 s)". Claude Code's own status line said more at the same moment: the task "Build US-0215 token history" and the activity "Rerunning view tests after fixing expectation". Earlier runs showed "step n of m" (`tokenDetail.progress.steps`, from the plan's ticked steps, US-0507). This time no step count showed, though the plan (`construction/code-generation/code-generation-plan.md`, a zero-Unit plan at stage level) was being ticked. Hypotheses to check: the step count reads only per-Unit plans, and a permission state from the hook events (US-0214) is never cleared when the wait ends.
- **Acceptance Criteria:**
  - [x] **Given** main is waiting for a background agent or working, with no permission prompt open, **when** I look at Agent progress, **then** the main row does not say it is waiting for my permission; a permission state clears as soon as the permission is answered or the next event arrives.
  - [x] **Given** an agent was started with a task description (for example "Build US-0215 token history"), **then** its row shows that task next to the agent's name.
  - [x] **Given** the agent works through a plan with checkboxes, Unit or stage level (zero-Unit), **then** its row shows "step n of m" from the ticked steps, as before.
  - [x] **Given** the agent is running a tool, **then** the row says what it does in words when that is known (the tool call's description, for example "Rerunning view tests after fixing expectation"), not only the tool's name; with no description it falls back to "running Bash".
  - [x] A state that has had no new event for a while says how long ago it was seen, so an old state is not shown as current.
  - [x] Every text goes through `t()` in Swedish and English, in the LCARS look; status is never shown by colour alone.
  - [x] A test fails without the fix and passes with it; the existing suite stays green.
- **Notes:** Runs on the `express` plan (decided 2026-11-18), not `quick-fix`. Likely touches `src/main/parsers/agentProgress.js`, `src/main/agentEvents.js` (the hook event state) and `src/renderer/AgentProgress.jsx`. Screenshot of the report: the token view of `261118-finished-token-history`, 2026-11-18 19:51.
- **Done (2026-11-18, express workflow `261118-honest-agent-progress`, branch `fix/US-0030`):** A permission request now lands on the row of the agent that asked (`src/shared/agentActivity.js`, `src/main/agentEvents.js`), and main shows "waiting for <agent>" until that wait ends; an answer in the app clears it. `src/main/agentAdapters.js` lets two bounded texts through `agentLine()` (one line, at most 80 characters, outside paths hidden): the tool call's description and the Agent tool's task, which deliberately relaxes US-0214's identifiers-only rule. Claude Code's SubagentStart carries no task or parent id, so a task is paired with its agent by type and order. Hook rows take "step n of m" from the audit build row of the same agent (`src/renderer/AgentProgress.jsx`), and any row quiet for 30 s shows "seen N ago". 1931/1931 tests pass, 92.32% line coverage. Known limit: two agents of the same type started at the same moment may swap tasks.
- **Dependencies:** US-0507, US-0214

**US-0031: The agent dialog opens on the page that just arrived, never on the message read last** ✅ Released in v0.2.10
- As a **developer answering the app's dialogs**, in order to **trust that what I read and pick belongs to the moment I am in**, I would like **the dialog to open on the page that just arrived, and an old page that is already answered never to show as the current one**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Medium
- **Background:** Reported 2026-11-18: "the dialogs seem a bit flaky. quite often they seem to hang on to old messages and next time a dialog is shown the old message is still there. this is mostly when we display if we want to compact or create new session." Two things meet. The dialog keeps the page it was last on (`pageId`, `lastIndex` in `AgentDialog.jsx`) across being closed and opened again, and only falls back to the newest event when that page has left the list; a new event arriving while the dialog is closed opens it (`setPopupOpen(true)` in `App.jsx`) without naming a page. And a page that is no longer waiting stays in the store's list: `move` in `agentEvents.js` deletes an event only on `ended`, so a question in `sent` or `handedBack`, and a reply in `stale`, are still pager items. `byPager` puts the handoff page last (rank 2, after questions and replies), so an old answered question always wins over the compact / fresh-session page — which is why it shows up mostly there. The same list decides `hasNewQuestion` in `App.jsx`, so settled pages also keep the dialog from closing by itself once nothing new is waiting. Hypotheses to check while building: the reopening rule (which page shows when the dialog is opened by a new event), the dialog's "still something open" test, and whether a handoff page can be replaced by a newer offer without the person seeing it.
- **Acceptance Criteria:**
  - [x] **Given** the dialog was closed on a page that is still in the list, **when** a compact, fresh-session or gate page arrives and the dialog opens, **then** that page is the one shown, not the earlier message; the earlier page is still reachable with Previous/Next.
  - [x] **Given** the page on screen is settled (sent, handed back or stale) and a new page arrives while the dialog is open, **then** the new page takes over.
  - [x] **Given** the dialog is open on a live page and a new page arrives, **then** the page being read stays put and "+n nya" counts the new one, as today (BR2.1 unchanged).
  - [x] **Given** only settled pages are left and nothing is waiting, **then** the dialog closes by itself, as it does when no event is left.
  - [x] **Given** Claude Code and opencode, both behave the same; the fresh-session choice is still typed through the existing handoff path.
  - [x] Every text goes through `t()` in Swedish and English, in the LCARS look; a state is never shown by colour alone.
  - [x] A test fails without the fix and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan. Most likely touches `src/renderer/AgentDialog.jsx` (the page it opens on and `lastIndex`), `src/renderer/App.jsx` (`hasNewQuestion`, `receiveAgentEvents`) and, if a settled page should leave the list sooner, `src/main/agentEvents.js` (`move`, `KEPT`, `OPEN`). Existing tests: `tests/renderer/AgentDialog.test.jsx`, `tests/renderer/AgentDialogHandoff.test.jsx`, `tests/main/agentEvents.test.js`. Keep the deliberate rule that a page stays put while it is being read — the fix is about which page is shown when the dialog opens or when the shown page is already finished.
- **Done (2026-11-19, express workflow `261118-dialog-newest-page`, branch `fix/US-0031`):** When new pages open a closed dialog, it now opens on the first of them in pager order (`popupFocus` from `receiveAgentEvents` in `src/renderer/App.jsx`); an open dialog is never moved. A page that is over (`isSettled` in `src/shared/agentOrder.js`: a hook page in `sent`, `handedBack`, `stale` or `ended`) gives way to the first page that arrived after it (`src/renderer/AgentDialog.jsx`), and no longer holds the dialog open (`hasNewQuestion`). `src/main/agentEvents.js` is unchanged, so settled pages stay reachable with Previous/Next. 1970/1970 tests pass, 92.4% line coverage. The hook timing test (`tests/main/agentHooksGuard.test.js`, 100 ms) fails while the machine is heavily loaded; it passes otherwise.
- **Dependencies:** US-0506, US-0213, US-0026

**US-0032: An agent never commits a feature-doc change the app is about to commit** ✅ Released in v0.2.11 (intent `261119-one-committer-rule`)
- As a **developer working with an agent in the app**, in order to **get one commit per change, made by one committer**, I would like **agents to leave feature-doc changes on `main` to the app, which commits and pushes them (US-0608)**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Small
- **Background:** Reported 2026-11-19: "that should never happen", about the double commit. Twice in one session, an agent on `main` changed `docs/FEATURES.md`, an epic file and a release plan, and then committed them itself. The app had already committed and pushed them (`de085ed`, `3349d29`), as US-0608 intends, so the agent's commit found nothing and its message was lost. Two committers race for the same change. Nothing tells the agent that the app commits feature docs: the THADEUS rule pack (US-0212, `COST_RULES_PACK` in `src/shared/costRules.js`) has no such rule.
- **Acceptance Criteria:**
  - [x] The THADEUS rule pack carries the rule, in `project.md`: "On `main`, NEVER commit `docs/FEATURES.md`, `docs/features/` or `docs/releases/`; THADEUS commits and pushes them." It is written by the pack's existing preview and save (US-0212), so a project that already has the pack is offered the new line.
  - [x] **Given** a story branch, **then** the rule does not apply: the story's own markers and criteria stay with the story and are committed with it, as US-0608 says.
  - [x] **Given** an agent on `main` that changes a feature doc and follows the rule, **then** exactly one commit holds the change, the app's.
  - [x] The pack stays within its limits (US-0212 NFR2), and the clash check against `team.md` and `org.md` still runs.
  - [x] A test fails without the fix and passes with it (the shipped pack holds the rule); the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan. Touches `src/shared/costRules.js` and its tests. The app's commit subject can name a story that is only mentioned (`3349d29` named US-0503, a dependency); that is US-0033.
- **Dependencies:** US-0212, US-0608

**US-0033: The app's commit subject names only the stories that changed** ✅ Released in v0.2.11
- As a **developer reading the history of `main`**, in order to **see from a commit's subject which stories it changed**, I would like **the app's feature-doc commits to name only the stories whose own text changed**.
- **Epic:** EPIC-00
- **Priority:** Medium
- **Complexity:** Small
- **Background:** Reported 2026-11-19. `3349d29` named US-0503, which the commit only mentions as a dependency of US-1405. `b2ed89e` added one story to EPIC-00 and named all 32 of its stories, because the epic's "Stories:" line changed. The cause: `splitChange` in `src/main/parsers/features.js` gives each changed block every `US-` id in its text (`storyIdsIn`), and `subjectOf` in `src/main/planningSync.js` puts them all in the subject.
- **Acceptance Criteria:**
  - [x] **Given** a story block changes, **then** the subject names that story, from its heading (`**US-XXXX: …**`), and not the stories its text only mentions (Dependencies, Background, Notes).
  - [x] **Given** only an epic's header, "Stories:" line or "Status" line, a `FEATURES.md` row or a release plan row changes, **then** the subject names the stories added, removed or moved there, not every story the line lists. When none can be told, it reads `docs: update the feature docs`.
  - [x] **Given** a new story is added, **then** the subject names that story alone (for `b2ed89e`: `docs: update US-0032`).
  - [x] A long subject is cut after five stories, with "and N more" (e.g. `docs: update US-1401, US-1402, US-1403, US-1404, US-1405 and 2 more`).
  - [x] Telling the story branch's own changes from the rest (US-0608 FR3) still works, and its tests stay green.
  - [x] A test fails without the fix and passes with it, with both commits above as cases; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan. `splitChange` decides both the subject and what is the story's own on a story branch. Keep them apart, or check that a block's own id (from its heading) is also right for the story-branch split. Touches `src/main/parsers/features.js`, `src/main/planningSync.js` (`subjectOf`) and their tests.
- **Dependencies:** US-0608

**US-0034: The Linux update installs, or says why it cannot and what to run** ✅ Released in v0.2.12
- As a **developer updating the app on Linux**, in order to **get the new version without guessing**, I would like **the update to ask for my password as before, and when it cannot, to show the real reason and the command to install it myself**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Small
- **Background:** Reported 2026-11-19 on v0.2.11: the update stopped with "Command failed: pkexec dpkg -i <file>". Run in a shell, the same command says "pkexec must be setuid root"; earlier releases asked for the password. The updater runs `pkexec` by name through the login shell's PATH (`runFixed`), so a `pkexec` without the setuid bit earlier in PATH (Homebrew, Nix, conda, `~/.local/bin`) is the one that runs. `firstLine()` in `src/main/updater.js` keeps only Node's "Command failed" line, so the reason on the next line is lost.
- **Acceptance Criteria:**
  - [x] **Given** an update on Linux, **then** the app runs `/usr/bin/pkexec /usr/bin/dpkg -i <file>` by absolute path, not whatever `pkexec` comes first in PATH.
  - [x] **Given** a step fails, **then** the message shows the reason the command printed (its last stderr line, or its exit code), not "Command failed: …".
  - [x] **Given** pkexec cannot ask for the password (not setuid root, no authentication agent, not found), **then** the app asks for the person's password in its own dialog and installs with `sudo -S /usr/bin/dpkg -i <file>`, the password passed on stdin only, never logged, stored or put on the command line.
  - [x] **Given** a wrong password, **then** the dialog says so and asks again; **given** the person cancels it, **then** the running version stays and the notice shows the command to install it by hand, `sudo apt install <file>`, with the file's full path.
  - [x] **Given** the person closes pkexec's own password dialog, **then** the app does not ask again with its own.
  - [x] Every new text goes through `t()` in `sv.json` and `en.json`.
  - [x] A test fails without the fix and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan, then ships alone as hotfix v0.2.12. Touches `src/main/exec.js` (stdin `input`), `src/main/updater.js`, `src/main/ipc.js`, `src/renderer/UpdateNotice.jsx`, the locales and their tests.
- **Dependencies:** US-0413

**US-0035: The app finds the agent CLIs even when the login shell is slow to start** ✅ Released in v0.2.13
- As a **developer who installs Claude Code through nvm**, in order to **use the agent tabs right after I open the app**, I would like **the app to find `claude` on my login shell's PATH, and to look again when I scan, even when the shell took long to start once**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Small
- **Background:** Reported 2026-11-20 on the installed v0.2.12: the app could not find the Claude Code CLI, and scanning in Settings › Tools did not find it either. `claude` was at `~/.nvm/versions/node/v22.14.0/bin/claude`, on PATH only through `~/.bash_profile` (nvm, RVM and several `brew --prefix` calls). `loginPath` in `src/main/exec.js` gives the login shell 5 s, falls back to the app's own PATH (no nvm) when it is slower, and keeps that answer for the whole run, so every later scan uses the same PATH. Likely cause; not yet confirmed from a log.
- **Acceptance Criteria:**
  - [x] **Given** the login shell does not answer in time, **then** the app uses its own PATH for that call and does not keep it: the next lookup asks the login shell again.
  - [x] **Given** a scan in Settings › Tools, **then** the PATH is read again from the login shell, so a tool installed or moved while the app runs is found.
  - [x] **Given** a slow login shell (around 5–10 s), **then** the lookup still gets its PATH; the time limit is longer than 5 s.
  - [x] **Given** the fallback was used, **then** the tool's row says the login shell's PATH could not be read, so the person knows why it is missing.
  - [x] Every new text goes through `t()` in `sv.json` and `en.json`.
  - [x] A test fails without the fix and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan. Touches `src/main/exec.js` (`loginPath`), `src/main/tools.js`, the Tools view's row and their tests. Workaround until it ships: restart the app, or choose the path in Settings › Tools.
- **Dependencies:** US-0405, US-0410

**US-0036: On a story branch, the planning views show main's releases** ✅ Released in v0.2.13
- As a **developer planning releases while a story branch is checked out**, in order to **see and use a release as soon as it is on `main`**, I would like **the Releases and Features views to show the planning that is on `main`, not the older copy in my branch**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Small
- **Background:** Reported 2026-11-20 on `feat/US-1408`: release v0.2.13 was pushed to `main` (`81f2107`, `a43f224`), but the app did not show it. The planning views read `docs/releases/` and the epic files from the checkout. On a story branch, `planningSync.js` keeps only the story's own blocks in the checkout and commits everything else to `main` through `dash/planning`, so a release made on `main` after the branch was cut stays out of sight until the branch merges `main`. Edits made in the branch to other stories were also put back, and the queue then showed seven "has changed on the target as well" conflicts against `main`.
- **Acceptance Criteria:**
  - [x] **Given** a story branch is checked out, **then** the Releases view and the epic and story statuses show the planning on `origin/main` (read with git, without changing the checkout), with the story branch's own story blocks on top.
  - [x] **Given** a release or story is added on `main` by another clone or straight to `main`, **then** it shows after the next fetch, without merging `main` into the branch.
  - [x] **Given** the planning sync queue holds an older copy of a file than `main` has, and nothing in it is newer, **then** the app drops it by itself instead of offering "Use mine", which would overwrite `main` with the older copy.
  - [x] The view says which branch its planning comes from.
  - [x] Every new text goes through `t()` in `sv.json` and `en.json`.
  - [x] A test fails without the fix and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan. Likely touches `src/main/planningSync.js`, `src/main/features.js` (where releases are loaded), `src/main/git.js` and their tests. Workaround until it ships: merge `main` into the story branch.
- **Dependencies:** US-0608, US-0032

---

**US-0037: The intent head shows one clear control per state, in the LCARS look** ✅ Released in v0.2.14
- As a **developer looking at an intent in flight**, in order to **read the intent head at a glance and know which button does what**, I would like **the park and resume controls, the step and the cost to fit the head's LCARS layout, say each thing once, and never offer two buttons for the same action**.
- **Epic:** EPIC-00
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Reported 2026-11-20 on intent `261120-us0311-agi-absence-on`. Park shows as a small, top-aligned 32 px block with its label pressed against the edge, wedged between the title and the tall pill-shaped "Resume at …" button. It does not line up with the resume button or the chips, and pushes the head out of shape. `ParkControls` (`src/renderer/IntentDetail.jsx`) renders `lcars-block--sm` as its own flex item in `.intent-head`, which aligns items to the top (`src/renderer/theme.css`, US-0510). Seen again 2026-11-22 on the parked intent `261119-spec-kit-framework`, and the person asked to revisit the logic as well as the look. For a parked intent the head shows three elements for one state: the orange "Parked at Functional Design" pill, an "Unpark" block jammed against it, and "Resume at Functional Design in Claude", which unparks too (`unparkThenResume` in `src/renderer/ResumeButton.jsx`). The step shows twice ("(Step 11 of 16)" on the resume button, "Step 11 of 16" in the progress row) and the sidebar reads "Stages 10/16" beside it. The progress row says "In progress · Functional design" while the intent is parked. The sidebar's cost ("recorded $136.12 · at current prices $134.67") wraps into five large lines.
- **Acceptance Criteria:**
  - [x] **Given** the active intent in flight and not parked, **then** the head shows Resume and Park side by side, the same height, aligned, with padding around their labels.
  - [x] **Given** a parked intent, **then** the head shows the parked state once, as an LCARS element, and one action, "Unpark and resume at <stage>"; there is no separate Unpark button doing half of the same thing.
  - [x] **Given** a parked intent, **then** the progress row says it is parked at its stage, not "In progress".
  - [x] The step is shown once, in the progress row; the resume button names only the stage. The sidebar's stage count is labelled so it does not read as a different step.
  - [x] The sidebar's cost fits its column at its normal size, without wrapping into large lines.
  - [x] **Given** a narrow window, **then** the head wraps cleanly, with Park staying next to Resume.
  - [x] The look follows the LCARS interface. Every new text goes through `t()` in `sv.json` and `en.json`.
  - [x] A test fails without the fix and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan. Likely touches `src/renderer/IntentDetail.jsx` (`ParkControls`, the head and progress row, the sidebar), `src/renderer/ResumeButton.jsx`, `src/renderer/theme.css` and their tests.
- **Dependencies:** US-0510

---

**US-0038: An old planning commit the target has moved past never blocks the planning sync** ✅ Released in v0.2.14
- As a **developer planning releases in the app**, in order to **trust that what I plan reaches `main`**, I would like **the planning sync to recognise a change that `main` has already moved past, and to keep pushing everything else**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Small
- **Background:** Reported 2026-11-20 after the v0.2.13 release. The app's `dash/planning` branch still held `6502115 docs: update US-0035` from 07:31: the first one-story draft of `docs/releases/0.2.13.md`. The full plan reached `main` later through the story and release pull requests, so every push cycle rebased that commit onto `origin/main`, conflicted on the file and stopped with "The planning conflicts with main … Nothing was pushed". From then on nothing the app recorded was pushed. A content entry from 12:39 held the same file's pre-release text ("📋 Planned") and showed "has changed on the target as well". The older-copy check from US-0036 FR2.3 did not catch either, because neither text was ever committed on `main`. The commit subject also named US-0038 before this story existed: `addContent` (`src/main/planningRecord.js`) merges the story ids of every earlier version of an entry and never drops them.
- **Acceptance Criteria:**
  - [x] **Given** a commit on `dash/planning` conflicts with the target on a file the target changed after that commit was made, **then** the app does not stop every later push: it offers "Keep theirs" for that file (dropping its change), and the push of everything else goes ahead.
  - [x] **Given** a waiting entry or app commit for a release plan whose release is tagged on the target, **then** the app drops it by itself and logs why, without offering "Use mine".
  - [x] **Given** an entry's text changed several times before its commit, **then** the commit subject names only the stories its final change is about (US-0033 still holds).
  - [x] **Given** the push is blocked, **then** the Planning sync row says which commit or entry blocks it and what to choose, instead of only "tries again at the next interval".
  - [x] Every new text goes through `t()` in `sv.json` and `en.json`.
  - [x] A test fails without the fix and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan. Likely touches `src/main/planningSync.js` (`pushFrom`, `pushAll`, `replayStep`), `src/main/planningRecord.js` (`addContent`), the planning sync row in the Releases view and their tests. The 2026-11-20 block was cleared by hand: delete `dash/planning` and choose "Keep theirs" for `docs/releases/0.2.13.md`.
- **Dependencies:** US-0036, US-0608

---

**US-0039: Fresh session and Compact act now, or ask AI-DLC to park, instead of waiting for an idle that never comes** ✅ Released in v0.2.14
- As a **developer whose AI-DLC session has grown large**, in order to **really get a fresh session when I pick one**, I would like **the handoff dialog to act at once when it is safe, and otherwise to tell AI-DLC to stop at its next safe point so the app can clear and resume**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Small
- **Background:** Reported 2026-11-22. Choosing Fresh session (or Compact) shows "Waiting until the agent is idle…" and nothing happens. `sendHandoff` (`src/renderer/terminalControl.js`) types nothing until `isIdle` (`src/main/sessionHandoff.js`) is true, for up to 30 minutes. `isIdle` is false while a question is open, which includes the AI-DLC gate the page itself was offered at, and false all through an autonomous run that never stops.
- **Acceptance Criteria:**
  - [x] **Given** AI-DLC waits at a gate (its question is open), **when** I pick Fresh session, **then** the app hands the question back, and types `/clear` and `/aidlc --resume` at once; the gate shows again in the new session.
  - [x] **Given** the agent is working, **when** I pick Fresh session, **then** the app types one line into the session asking AI-DLC to park at its next safe point (`aidlc engine orchestrate park --person-asked`), the page says so, and once the agent stops the app types `/clear` and `/aidlc --resume`.
  - [x] **Given** the agent is working, **when** I pick Compact, **then** the same park request is sent and `/compact` follows when the agent stops.
  - [x] **Given** the agent is already idle, **then** the choice is typed at once, as today.
  - [x] Every new text goes through `t()` in `sv.json` and `en.json`.
  - [x] A test fails without the fix and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan. Likely touches `src/main/sessionHandoff.js` (`isIdle`, `commandsFor`), `src/renderer/terminalControl.js` (`sendHandoff`), `src/renderer/AgentDialog.jsx` (`HandoffPage`) and their tests. A hard interrupt (Esc) mid-turn is left out: it can cut a file write short.
- **Dependencies:** US-0213, US-0026

---

**US-0040: The intent list puts open work first and orders the rest by when it really happened** ✅ Released in v0.2.14
- As a **developer opening a project**, in order to **find the work in flight without scrolling**, I would like **in-flight and parked intents at the top, and the finished ones newest first by their real creation time**.
- **Epic:** EPIC-00
- **Priority:** Medium
- **Complexity:** Small
- **Background:** Reported 2026-11-22. "Sort: Date" orders by folder name, descending (`src/main/parsers/intents.js`, `b.dirName.localeCompare(a.dirName)`), and `sortIntents` (`src/renderer/IntentList.jsx`) keeps that order. Folder names carry only the day, so intents from the same day come out in reverse alphabetical order: `spec-kit-ideation` above `spec-kit-framework` above `release-0-2-11`, though `release-0-2-11` was made between them. The only in-flight intent, the parked `spec-kit-framework`, sits third, between finished ones. The real order is known: the `uuid` in `intents.json` is time-ordered (UUID v7), and each intent's last activity is read already (`activityAt`).
- **Acceptance Criteria:**
  - [x] **Given** sort by date, **then** intents in flight or parked come first, the active one at the top, then the finished ones, each group newest first by creation time (the `uuid`'s time, else the folder date).
  - [x] **Given** two intents from the same day, **then** the one made later comes first, whatever their names.
  - [x] **Given** an intent on disk but not in `intents.json` (no `uuid`), **then** it sorts by its folder date, after the same day's indexed intents.
  - [x] Sort by cost and by name are unchanged.
  - [x] A test fails without the fix and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan. Likely touches `src/main/parsers/intents.js`, `sortIntents` in `src/renderer/IntentList.jsx` and their tests. Open question for the person: a separate "Last activity" sort is left out unless asked for.
- **Dependencies:** US-0510

---

**US-0041: "Wait until the AI-DLC step is done" shows only while a step really runs** ✅ Released in v0.2.14
- As a **developer updating the AI-DLC tool or pulling from GitHub**, in order to **use those buttons whenever no AI-DLC step runs**, I would like **the "Wait until the AI-DLC step is done, or park the work first" notice to show only while AI-DLC is working on a stage, and to go away by itself when it stops or is parked**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Small
- **Background:** Reported 2026-11-22: the notice (`github.wait`) in Settings › Tools (`src/renderer/AidlcUpdate.jsx`) and the GitHub refresh panel (`src/renderer/RefreshPanel.jsx`) "never disappears, even when AI-DLC is not working", and the buttons stay disabled. Both use `isWorkflowRunning` (`src/renderer/workflowBusy.js`, US-0502 FR3.5, US-0504 FR4): an agent tab is busy, or anything under `intents/` changed in the last 5 minutes (`lastIntentChangeAt`, `src/renderer/useProject.js`). AI-DLC's hooks append a `HUMAN_TURN` entry to the active intent's audit shard on every message typed to the agent, also when the intent is parked or complete (the finished `261120-release-0-2-13` shard changed this way on 2026-11-22). So any chat with the agent keeps the window open, parking does not clear it, and a busy agent tab counts as an AI-DLC step even when it only answers a question.
- **Acceptance Criteria:**
  - [x] **Given** the active intent is complete or parked, **then** the notice does not show and the buttons are enabled, whatever the agent tab is doing.
  - [x] **Given** the active intent is in flight and the only recent changes under `intents/` are audit entries that are not stage work (`HUMAN_TURN` and similar) or the engine's runtime files, **then** those changes do not count as AI-DLC working.
  - [x] **Given** a stage is running (its state or artifacts change, or an agent tab is busy with the in-flight intent), **then** the notice shows as today, and it goes away by itself within a minute of the step stopping or the work being parked.
  - [x] **Given** the notice shows, **then** it says why (which intent and stage), so the person knows what to wait for or park.
  - [x] Every text goes through `t()` in `sv.json` and `en.json`.
  - [x] A test fails without the fix and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan. Likely touches `src/renderer/workflowBusy.js`, `src/renderer/useProject.js` (what sets `lastIntentChangeAt`), possibly `src/main/watcher.js` (which changes it reports), `AidlcUpdate.jsx`, `RefreshPanel.jsx` and their tests.
- **Dependencies:** US-0502, US-0504, US-0510

---

**US-0042: The splash screen stays open long enough to be seen** ✅ Released in v0.2.14
- As a **developer starting the app**, in order to **see the splash instead of a flash**, I would like **the start-up splash to stay open longer**.
- **Epic:** EPIC-00
- **Priority:** Low
- **Complexity:** Small
- **Background:** Asked for 2026-11-22. The splash (`src/renderer/Splash.jsx`) stayed at least 0.9 s and at most 4 s, so on a fast start it only flashed.
- **Acceptance Criteria:**
  - [x] **Given** the app is ready at once, **then** the splash still stays open at least 2.5 s, then fades out.
  - [x] **Given** a slow start, **then** the splash leaves by 6 s at the latest.
  - [x] A test fails without the change and passes with it; the existing suite stays green.
- **Notes:** A code fix, built inside the v0.2.14 release intent (`fix/US-0042`).
- **Dependencies:** none

---

**US-0043: A cleaning pass: no ESLint warnings, simpler code** ✅ Released in v0.2.15
- As a **developer working on the app**, in order to **see real problems in the lint output instead of 30 familiar warnings**, I would like **a cleaning pass that clears the ESLint warnings and simplifies the code they point at, using the `/simplify` skill**.
- **Epic:** EPIC-00
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-22 after the v0.2.14 release. `npx eslint .` (and CI's `verify` job) reports 30 warnings and 0 errors, nearly all `react-hooks/exhaustive-deps` on `useEffect`, `useCallback` and `useMemo`: missing dependencies (`load`, `t`, `bridge`, `terminal`, `project.projectId`, `onMeta`, `onActiveRecord`, `checkNow`, `now`, …) and complex expressions in dependency arrays. They sit in `App.jsx`, `CostRulesSection.jsx`, `FeaturesView.jsx`, `ModelProfilesSection.jsx`, `ProfileSwitchDialog.jsx`, `ProjectSettingsView.jsx`, `ProjectView.jsx`, `RefreshPanel.jsx`, `TerminalContext.jsx`, `TokenView.jsx`, `UpdateNotice.jsx`, `useFeatures.js` and `tests/renderer/EditorPanel.test.jsx`. Some hide real stale-closure bugs; others are effects that should run once and need a clearer shape.
- **Acceptance Criteria:**
  - [x] The `/simplify` skill is run over the code the warnings point at (and the files it touches), and its fixes are applied where they keep behaviour the same.
  - [x] Each warning is fixed for its cause: a stable callback (`useCallback`, a ref), a dependency added where the effect must rerun, an effect split or moved into an event handler, or a value extracted from a complex dependency expression. A rule is never switched off to silence a warning, and an `eslint-disable` line is used only with a comment that says why.
  - [x] `npx eslint .` reports 0 errors and 0 warnings, and CI keeps it that way (the lint step fails on warnings, `--max-warnings 0`).
  - [x] No behaviour changes: a test fails first wherever a warning hid a real bug (a stale value, a missed rerun), and the full suite, coverage (80%), the built-app end-to-end tests and Prettier stay green.
- **Notes:** A code chore, so it runs on the `quick-fix` plan. Built last in v0.2.15, after US-0508, because it touches the same files (`App.jsx`, `ProjectView.jsx`, `ProjectSettingsView.jsx`) and would otherwise clash with their branches.
- **Dependencies:** none

---

**US-0044: The intent view fits the window and its parts stay inside their frames** ✅ Released in v0.2.15
- As a **developer following an intent**, in order to **see all of the intent view without parts cut off or spilling out**, I would like **the intent view's rows, buttons and panels to fit the window and stay inside the LCARS frames**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Small
- **Background:** Reported 2026-11-22 with two screenshots of the v0.2.14 app on the `spec-kit-framework` intent, after the US-0417 LCARS rework. The view is wider than the window: the story chips row, the tab row (Review and Files out of sight in a narrow window), the Units graph, the intent name, the "Unpark and resume" button and the "Read the review" button are cut off at the right edge. There is an empty band between the title bar and the chips row. The Review view's heading sits against the tab row. The left arm's Live tokens panel spills out of the arm's curve, with its chart below the frame.
- **Acceptance Criteria:**
  - [x] **Given** a window of any width the app allows, **then** the intent view has no horizontal overflow: the chips and the tabs wrap or scroll inside their own row, and the head's intent name and buttons stay fully visible.
  - [x] **Given** a wide Units graph, **then** it scrolls inside its own panel and does not widen the view.
  - [x] **Given** the intent view, **then** there is no empty band between the title bar and the chips row, and each view's heading has the usual space below the tab row.
  - [x] **Given** the left arm, **then** the Live tokens panel and its chart stay inside the arm's frame.
  - [x] A test fails without each change and passes with it; the existing suite, the built-app end-to-end tests and the LCARS look stay as they are.
- **Notes:** A code fix, so it runs on the `quick-fix` plan (`fix/US-0044`). Fix forward as the next patch release.
- **Dependencies:** US-0417 ✅

---

**US-0045: The agent dialog clears its compact, fresh-session and no-intent pages, and shows the newest message** ✅ Released in v0.2.15
- As a **developer answering the app's dialogs**, in order to **act on what is happening now**, I would like **the dialog to drop its compact, fresh-session and no-intent pages once they no longer apply, and to show a new message when it arrives instead of the last one in the queue**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Small
- **Background:** Reported 2026-11-23: the dialogs still do not clear the compact / new session / no-intent pages, and when a new message comes in, the last message in the queue is shown, not the new one. US-0031 (v0.2.10) fixed the same symptom for the page the dialog was closed on; this case is still open.
- **Acceptance Criteria:**
  - [x] **Given** a compact, fresh-session or no-intent page in the dialog, **when** it no longer applies (it was picked, the session restarted, or an intent became active), **then** it leaves the dialog's queue.
  - [x] **Given** the dialog has earlier pages in its queue, **when** a new message arrives, **then** the dialog shows the new message; the earlier pages stay reachable with Previous/Next.
  - [x] A test fails without each change and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan (`fix/US-0045`).
- **Dependencies:** US-0031 ✅

---

**US-0046: The agent dialog names the project it comes from when several projects are open** ✅ Released in v0.2.15
- As a **developer with several projects open**, in order to **know which project is asking before I answer**, I would like **each agent dialog page to name the project it comes from**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Small
- **Background:** Reported 2026-11-23: with several projects open, a dialog page does not say which project it comes from, so a question, gate, compact or fresh-session offer can be answered for the wrong project.
- **Acceptance Criteria:**
  - [x] **Given** two or more projects are open, **when** the agent dialog shows a page, **then** the page names the project it comes from (the project's name, as in the project list), in the LCARS look.
  - [x] **Given** the dialog's queue holds pages from different projects, **when** I page with Previous/Next, **then** each page shows its own project.
  - [x] **Given** only one project is open, **then** the dialog looks as it does now, without a project name.
  - [x] The project name goes through `t()` with an ICU placeholder, with the same key in `sv.json` and `en.json`.
  - [x] A test fails without each change and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan (`fix/US-0046`).
- **Dependencies:** US-0031 ✅

**US-0047: A temporary file that is gone does not stop the planning sync** ✅ Released in v0.3.0
- As a **developer**, in order to **have my app files synced without help**, I would like **the sync to ignore temporary files and to carry on when a waiting file no longer exists**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Small
- **Background:** Reported 2026-11-24: five changes stayed in the planning sync and Push now did not clear them. One was a temporary file of the atomic write (`.<name>.<uuid>.tmp`) that was gone. `git add` fails on a path that is neither on disk nor in the worktree, so every cycle failed and the other four files waited with it.
- **Acceptance Criteria:**
  - [x] **Given** a temporary file of the atomic write under `.thadeus/`, **then** it is never recorded as a waiting change.
  - [x] **Given** a waiting file that is neither on disk nor at the target, **when** a cycle runs, **then** the other files are pushed and that entry is cleared.
  - [x] **Given** a record that already holds such an entry, **then** the next cycle clears it without help.
  - [x] A test fails without each change and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan (`fix/US-0047`).
- **Dependencies:** US-0609 ✅

**US-0048: The Spec Kit views show the right count and tags, and nothing is squeezed** ✅ Released in v0.3.0
- As a **developer**, in order to **trust and read the Spec Kit views**, I would like **them to show the right feature count and hook modes, with room around every part**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Small
- **Background:** Found 2026-11-25 when the Spec Kit views were looked at in the built app (Build and Test of EPIC-14, faults L1–L6 in its `test-results.md`). jsdom cannot show layout, so the suite did not catch them.
- **Acceptance Criteria:**
  - [x] **Given** a Spec Kit project with two features, **then** the foot of the left arm says "2 features", and it follows when a feature is added or removed (L1).
  - [x] **Given** mandatory, optional and turned-off hooks in Configuration › Spec Kit, **then** each mode's tag has its own colour (L2).
  - [x] **Given** a feature with a long name in the Specs list, **then** its number and its Active tag each stay on one line (L3).
  - [x] **Given** the Specs view, **then** there is a gap below Commands and below the next command (L4).
  - [x] **Given** the first-open choice at 1280 and 1920, **then** the two options stand side by side (L5).
  - [x] **Given** a disabled accent button in Configuration, **then** it has the disabled look of the other buttons (L6).
  - [x] A test fails without each change and passes with it, layout ones in the built app; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan (`fix/US-0048`). L6 affects every accent button in Configuration.
- **Dependencies:** US-1402 ✅, US-1404 ✅, US-1406 ✅, US-1407 ✅

**US-0049: The menu item Github is called Version control** ✅ Released in v0.3.0
- As a **developer**, in order to **find the view whichever platform my project is on**, I would like **the menu item to be called Version control**.
- **Epic:** EPIC-00
- **Priority:** Medium
- **Complexity:** Small
- **Background:** Asked for 2026-11-25, before v0.3.0. The view also covers GitLab and Bitbucket.
- **Acceptance Criteria:**
  - [x] **Given** the left arm, the view's heading and the View menu, **then** they say "Version control".
  - [x] **Given** the app in Swedish, **then** it says "Version control" there too: the Swedish word does not fit the arm on one line (the person's call).
  - [x] A test fails without the change and passes with it; the existing suite stays green.
- **Notes:** Made directly, without an AI-DLC workflow, at the person's request (`fix/US-0049`).
- **Dependencies:** none

**US-0050: Every view is audited for motion, and elements that lack animation get it** 📋 Planned, for v0.3.1
- As a **developer who lives in the console**, in order to **see what changed and feel the same living console everywhere**, I would like **every view gone through for motion, and animations added to the elements that lack them**.
- **Epic:** EPIC-00
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-25. US-0402 and US-0417 gave the app its motion language, and the shared entrance (`useEntrance` in `Lcars.jsx`) runs each time a view is entered. But it moves only the pieces with an `lcars-e-*` class, and nearly all of those are the shared ones in `Lcars.jsx` (frames, elbows, section headings, readout tables, meters). Most views' own elements, such as the rows in the intent list, the timeline, Plans, Machines and the Spec Kit features, have none and simply appear. US-0402 also left the tab transitions unbuilt.
- **Acceptance Criteria:**
  - [ ] **Audit first:** every view, dialog and panel, AI-DLC and Spec Kit, is listed with its elements and what moves today: on entering, on switching tab, on fold and unfold, when a row arrives, changes or leaves, on hover and focus, and while loading. Each gap is marked "add" or "leave still", with the reason. The person approves the list before any code.
  - [ ] **Given** any view in the list marked "add", **when** I enter it, **then** its marked elements join the one shared entrance sequence.
  - [ ] **Given** tabs inside a view (Pipeline, Timeline, Units, Files, Cost and the like), **when** I switch, **then** the content changes with a short slide or fade of 150–250 ms (left over from US-0402).
  - [ ] **Given** a live change (a new row, a changed status, a new count), **then** the changed element shows it once, and nothing else on the screen moves.
  - [ ] **Given** an update that changes nothing on the screen, **then** nothing animates again, and no list replays its entrance.
  - [ ] Motion comes from the shared keyframes and classes in `theme.css`; a new one is added there once, not per view.
  - [ ] Reduced gives static effects and Off no motion, as the animations setting does everywhere. Nothing flashes more than 3 times per second, only transform, opacity, `filter` and `box-shadow` animate, and no animation blocks a click or moves focus.
  - [ ] The app stays at 60 fps with a project of 25 intents and 2 000 timeline events.
  - [ ] A test fails without each added animation and passes with it, the ones that depend on layout in the built app; the existing suite stays green.
- **Notes:** The pipeline's stage cards are US-0412, in the same release: the audit lists them but leaves them to that story. If the approved list grows past a fix, the story moves to EPIC-04 (the project's rule).
- **Dependencies:** US-0402 ✅, US-0417 ✅

**US-0051: The Edit button in Configuration › Spec Kit does not touch the constitution panel** ✅ Done, for v0.3.1
- As a **developer**, in order to **read the constitution without a button crowding it**, I would like **a gap between the Edit button and the panel**.
- **Epic:** EPIC-00
- **Priority:** Low
- **Complexity:** Small
- **Background:** Found in v0.3.0, added 2026-11-25 at the person's request. jsdom cannot show layout, so the suite did not catch it.
- **Acceptance Criteria:**
  - [x] **Given** Configuration › Spec Kit with a constitution, at 1280 and 1920, **then** there is a gap between the Edit button and the panel.
  - [x] A test in the built app fails without the change and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan (`fix/US-0051`).
- **Dependencies:** US-1404 ✅, US-0048 ✅

**US-0052: The tests of the agents working now and of the token detail pass every time** ✅ Done, for v0.3.1
- As a **developer**, in order to **trust a red test**, I would like **the tests of the agents working now and of the token detail not to depend on timing**.
- **Epic:** EPIC-00
- **Priority:** Low
- **Complexity:** Small
- **Background:** Found in v0.3.0, added 2026-11-25 at the person's request. `ConfigView.test.jsx`, "lists the agents working now …", failed once locally: the fake timer moved before the view had started its interval. Widened 2026-11-25 at the person's request: `TokenDetail.test.jsx`, "click or Enter on the small view opens the detail …", failed in two full local runs of US-0513, the second time over its 5 s limit (the first error was not kept). Alone it takes about 0.8 s, on `main` too; the machine's load average was near 10.
- **Acceptance Criteria:**
  - [x] **Given** the test, **when** it moves the clock, **then** the view's interval has started.
  - [x] It passes 50 times in a row, and still fails when the counter does not update.
  - [x] **Given** the token detail test, **when** the full suite runs on a loaded machine, **then** it stays within its limit, and the limit is not raised to get there. It passes 50 times in a row, and still fails when focus does not come back.
- **Notes:** Only the test changes, unless the cause turns out to be in the view. It runs on the `quick-fix` plan (`fix/US-0052`).
- **Dependencies:** none

**US-0053: The planning sync shows only what is really waiting, and pushes it after a branch switch too** ✅ Done, for v0.3.1
- As a **developer**, in order to **trust what the planning sync says is waiting**, I would like **it to clear what is already on the target, and to push its own commit also when I have left `main`**.
- **Epic:** EPIC-00
- **Priority:** High
- **Complexity:** Small
- **Background:** Reported 2026-11-25 with ten changes shown as waiting. Two faults in `src/main/planningSync.js`:
  - A change the app had recorded was committed and pushed outside the app (`05f124f`). `commitIn` then found nothing to commit, so the entries stayed pending (six of the ten were such files). They joined the app's next commit, which named their stories without holding any change to them (`011b158`).
  - The app committed on `main`, and the checkout moved to a story branch before the push. `sourcesOf` looks at the target only while it is checked out, so the commit was never pushed. `pushStep` then reads "nothing is ahead of origin" and drops the committed entries, though `main` is ahead.
- **Acceptance Criteria:**
  - [x] **Given** a recorded change whose text is already on the target, **when** a cycle runs, **then** its entry is cleared, and no later commit names its stories.
  - [x] **Given** the app's commit on local `main` and a checkout on another branch, **when** a cycle runs, **then** the commit is pushed, and the entries stay until it is on origin.
  - [x] **Given** local `main` also holds the person's own commits, **then** they are treated the same as when `main` is checked out.
  - [x] **Given** a record that already holds such entries, **then** the next cycle clears them without help.
  - [x] A test fails without each change and passes with it; the existing suite stays green.
- **Notes:** A code fix, so it runs on the `quick-fix` plan (`fix/US-0053`).
- **Dependencies:** US-0038 ✅, US-0608 ✅
