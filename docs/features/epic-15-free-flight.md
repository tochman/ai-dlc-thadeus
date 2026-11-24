# EPIC-15: Free flight — see agent work done outside the framework, in every project

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Asked for 2026-11-23 in GitHub issues #107 to #112. Free flight makes agent work visible when it runs without a framework. It is **not** a third framework next to AI-DLC and Spec Kit (US-1401): it is a layer that is always on, in every project, because even in a project that follows AI-DLC or Spec Kit we often ask the agent for small tasks outside the framework. Its base is a journal of every agent session, built from the activity the dialog hooks already report. No prompt text, tool input or agent message is ever written to it.
>
> Planned 2026-11-24 as its own minor release, v0.4.0 (journal, turn kinds and the view), followed by v0.4.1 (transcript backfill, the bridge visuals and promotion), as the project rule asks for a large addition.

**Stories:** US-1501–US-1506

**Status (2026-11-24):** 📋 US-1501–US-1503 planned, for v0.4.0. 📋 US-1504–US-1506 planned, for v0.4.1.

---

## User Stories

**US-1501: A journal of every agent session, in every project** 📋 Planned, for v0.4.0
- As a **developer**, in order to **see what my agents did even when I did not use the project's framework**, I would like **THADEUS to keep a journal of every agent session in the project, whatever framework the project follows**.
- **Epic:** EPIC-15
- **Priority:** High
- **Complexity:** Large
- **Source:** GitHub issue [#107](https://github.com/tochman/ai-dlc-thadeus/issues/107)
- **Background:** The hooks already report a harness neutral activity stream (`src/main/agentAdapters.js`, `src/shared/agentActivity.js`), but it lives in memory and is gone when a session ends.
- **Acceptance Criteria:**
  - [ ] **Given** a project that follows AI-DLC, Spec Kit or neither, **when** a session runs in the app's agent tab, **then** `.thadeus/journal/<harness>-<sessionId>.jsonl` receives its events, one per line, with only the fields `agentActivity.js` already copies, plus turn numbers.
  - [ ] **Given** a prompt `/speckit-plan add login`, **then** the prompt line has `"command":"/speckit-plan"`, and `add login` appears nowhere in the journal. **Given** no leading slash command, **then** there is no `command` field.
  - [ ] **Given** a turn during which a commit was made, **then** the turn's start and end lines carry different `HEAD` values (branch and dirty state are recorded too).
  - [ ] **Given** the app quits during a session, **then** the journal is complete up to the last batch, and the next start does not corrupt it.
  - [ ] **Given** Share the journal is off (the default), **then** `.thadeus/journal/` is ignored by git; turning it on shows the `.gitignore` change in a preview first.
  - [ ] Retention (90 days by default) and the 5 MB cap per session work, tested in `tests/main/journal.test.js` with a fake clock.
  - [ ] A test feeds every fixture in `tests/fixtures/agent-events/` through the journal and asserts that no prompt text, tool input or message text is written.
- **Notes:** Sessions run outside the app are rebuilt from transcripts in US-1504.
- **Dependencies:** US-0030, US-0214

**US-1502: Tell framework turns from free turns in every session** 📋 Planned, for v0.4.0
- As a **developer**, in order to **see my free tasks without seeing framework work twice**, I would like **each turn of an agent session to be marked as AI-DLC, Spec Kit or free flight, and linked to its intent or feature when it belongs to one**.
- **Epic:** EPIC-15
- **Priority:** High
- **Complexity:** Medium
- **Source:** GitHub issue [#108](https://github.com/tochman/ai-dlc-thadeus/issues/108)
- **Acceptance Criteria:**
  - [ ] A spike confirms whether the `Session` field AI-DLC writes in `HUMAN_TURN` and `HOST_TURN` equals the hooks' `session_id`, and its result is written here before the build.
  - [ ] **Given** three `/aidlc` turns followed by two free prompts, **then** the first three are `aidlc` with the right intent and the last two are `free`.
  - [ ] **Given** a `/speckit-plan` turn in a project that follows AI-DLC, **then** it is `speckit`, with the active feature as its reference.
  - [ ] **Given** an opencode session whose ids never appear in the AI-DLC log, but whose turn grew this machine's shard, **then** the turn is `aidlc`.
  - [ ] **Given** a turn that answered an AI-DLC question without a new prompt command, **then** it keeps the previous turn's kind.
  - [ ] `classifyTurns` is a pure module in `src/shared/turnKind.js`; each rule has its own test, and the tooltip names the deciding rule in Swedish and English.
- **Dependencies:** US-1501, US-1401

**US-1503: The Free flight view: free sessions with files, commits and cost** 📋 Planned, for v0.4.0
- As a **developer**, in order to **see and follow the tasks I gave my agents outside the framework**, I would like **a Free flight view in every project, listing those sessions with what they touched, what they committed and what they cost**.
- **Epic:** EPIC-15
- **Priority:** High
- **Complexity:** Large
- **Source:** GitHub issue [#109](https://github.com/tochman/ai-dlc-thadeus/issues/109)
- **Acceptance Criteria:**
  - [ ] **Given** a project that follows AI-DLC, **when** I ask the agent for a task without `/aidlc`, **then** a Free flight session shows with that turn, while the `/aidlc` turns of the same session link to their intent and are not counted as free.
  - [ ] **Given** a folder with no framework, **then** it opens with the shared shell and Free flight, and the setup choice (US-1406) offers Neither, just free flight.
  - [ ] **Given** a free session that edited three files and made one commit, **then** its detail lists the files (opening in the editor) and the commit, linked to its pull request when there is one.
  - [ ] **Given** recorded token readings, **then** a session's cost counts only its free turns, and every free session plus every intent adds up to the project total.
  - [ ] **When** I rename a session, **then** the new title shows after a restart. A running session updates live.
  - [ ] Renderer tests in Swedish, a Playwright check that a plain folder opens, every text through `t()` in Swedish and English, in the LCARS look.
- **Dependencies:** US-1501, US-1502, US-1401, US-1406, US-1409

**US-1504: Rebuild free sessions from agent transcripts** 📋 Planned, for v0.4.1
- As a **developer**, in order to **see free agent work I did outside the app or before free flight existed**, I would like **THADEUS to rebuild journal entries from the agent's own session transcripts for this project**.
- **Epic:** EPIC-15
- **Priority:** Medium
- **Complexity:** Medium
- **Source:** GitHub issue [#110](https://github.com/tochman/ai-dlc-thadeus/issues/110)
- **Acceptance Criteria:**
  - [ ] **Given** a Claude Code transcript of a session run outside the app, **then** the rebuilt journal holds the same turns, tool calls and subagents, and no prompt or message text.
  - [ ] **Given** a session already journaled by the hooks, **then** it is not rebuilt. **Given** a transcript that grew after it was rebuilt, **then** the next pass rebuilds it and the view updates.
  - [ ] **Given** a transcript outside this project's folder, **then** it is never read (as US-0215 NFR1 requires).
  - [ ] Rebuilt sessions are classified by US-1502 and show a "rebuilt" mark in the list and the detail.
  - [ ] An opencode spike is done and its result written here; without usable history, opencode sessions outside the app show as not available, with the reason.
  - [ ] Tests in `tests/main/journalBackfill.test.js` with transcript fixtures. Every text through `t()` in Swedish and English.
- **Dependencies:** US-1501, US-1502, US-1503, US-0215

**US-1505: Journal spans, so the waterfall, graph and replay work for free sessions** 📋 Planned, for v0.4.1
- As a **developer**, in order to **see a free flight session with the same waterfall and replay as an intent**, I would like **the journal to produce the same spans as the AI-DLC log, so every bridge view works on both**.
- **Epic:** EPIC-15
- **Priority:** Medium
- **Complexity:** Large
- **Source:** GitHub issue [#111](https://github.com/tochman/ai-dlc-thadeus/issues/111)
- **Acceptance Criteria:**
  - [ ] **Given** a journal fixture with two turns, one subagent and a permission wait, **then** `buildJournalSpans` returns exactly the fixture's expected spans (new kinds `turn`, `tool` and `wait-permission`).
  - [ ] **Given** a free session, **then** its waterfall shows turns, agents and tools on one axis, with permission waits marked, and the readout gives agent and waiting time.
  - [ ] **Given** 300 short `Read` calls in one turn, **then** the waterfall shows them as one merged bar with a count.
  - [ ] **Given** a session with subagents, **then** a small live graph shows them; sessions without subagents show no graph.
  - [ ] **Given** a free session, **then** Replay plays it, with commits on the scrubber.
  - [ ] Tests extend `tests/main/spans.test.js`. Every text through `t()` in Swedish and English, in the LCARS look.
- **Dependencies:** US-1501, US-1502, US-1503, US-0304, US-0305, US-0306, US-0308

**US-1506: Promote a free session to an intent or a feature, and show the free share** 📋 Planned, for v0.4.1
- As a **developer**, in order to **give a free task the structure it turned out to need, without starting over**, I would like **to promote a free flight session to an AI-DLC intent or a Spec Kit feature, with its files and commits handed over as context, and to see how much of the project's AI work is free**.
- **Epic:** EPIC-15
- **Priority:** Medium
- **Complexity:** Medium
- **Source:** GitHub issue [#112](https://github.com/tochman/ai-dlc-thadeus/issues/112)
- **Acceptance Criteria:**
  - [ ] **Given** a free session with files and commits, **when** I promote it to AI-DLC, **then** the agent tab holds the request with the title I edited, up to 20 paths and up to 10 commits, safely quoted (cleaned as in US-0512) and not submitted. Spec Kit gets `/speckit-specify` with the same context.
  - [ ] **Given** a project with both frameworks installed, **then** both are offered, the project's own first.
  - [ ] **Given** the new intent or feature appears, **then** the session shows as "Promoted to …", with a link.
  - [ ] **Given** a week of journal data, **then** Insights shows the free share of agent time and cost per week, matching free turns over all turns. It informs and never warns.
  - [ ] Every text through `t()` in Swedish and English, in the LCARS look.
- **Dependencies:** US-1503, US-0512, US-1303
