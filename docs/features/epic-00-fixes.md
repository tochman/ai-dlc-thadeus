# EPIC-00: Fixes — things that work, but not well enough

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Small fixes the person reports while using the app: something looks off, behaves wrongly or is missing a detail. Each fix becomes a story here, so nothing reported in passing gets lost. A fix that grows into a feature moves to its topic's epic.

**Stories:** US-0001, US-0002, US-0003, US-0004, US-0005, US-0006

**Status (2026-11-14):** ✅ US-0001 released in v0.2.3 (epic badge). ✅ US-0002 released in v0.2.3 (busy tab alignment). ✅ US-0003 released in v0.2.3 (lifecycle rule for every harness). ✅ US-0004 released in v0.2.3 (a popup answer reaches the agent once). ✅ US-0005 released in v0.2.3 (Resume waits while the work runs). ✅ US-0006 done for v0.2.4 (popup answers reach Claude Code's real picker).

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

**US-0006: Popup answers reach Claude Code's real picker** ✅ Done for v0.2.4
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
