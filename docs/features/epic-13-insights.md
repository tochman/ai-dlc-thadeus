# EPIC-13: Insights — what the AI work cost, what it delivered, and where it was wasted

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> EPIC-02 shows what a run costs, by intent, stage, agent and model, and US-0303 shows velocity. This epic turns those figures into insights that a person or a team can act on. Asked for 2026-11-18, after a look at Harness' "AI-DLC Insights" (adoption, spend efficiency and delivery impact, linked from the prompt to production). THADEUS has something a tool outside the workflow does not: the AI-DLC record (stages, gates, rejections, loop-backs, stories and releases). So it can say not only how much was spent, but why, and what the spend produced. In line with THADEUS' main value, minimising waste, the first stories show the waste.

**Stories:** US-1301–US-1307

**Status (2026-11-26):** ✅ US-1301 to US-1303 done, for v0.3.2. 🚧 US-1304 in progress, for v0.3.2. 📋 US-1305 planned, for v0.3.2. 📋 US-1306 and US-1307 planned, for v0.3.3.

---

## User Stories

**US-1301: Rework cost: what was spent on work that was thrown away** ✅ Done, for v0.3.2
- As a **developer or team lead**, in order to **see where AI spend produced nothing and cut it**, I would like **every intent, stage and release to show its rework cost: the tokens and estimated cost of attempts that were redone or dropped**.
- **Epic:** EPIC-13
- **Priority:** High
- **Complexity:** Medium
- **Background:** Asked for 2026-11-18. Harness calls this "wasted spend" (sessions with no committed code). The AI-DLC record says more precisely what was thrown away: a stage attempt that was rejected at its gate, a Build and Test run that ended in a loop-back, a stage that was redone or jumped back over, and an intent that was archived unfinished. The US-0214 intent is an example: its first Build and Test run failed and was repeated after a loop-back.
- **Acceptance Criteria:**
  - [x] **Given** an intent whose audit has rejected gates, loop-backs, backward jumps or redone stages, **when** I open its cost view, **then** a "Rework" figure shows the tokens and estimated cost of each thrown-away attempt, with its reason (rejected, loop-back, redone, jumped back) and the stage it belongs to.
  - [x] **Given** an archived intent that never finished, **then** its whole cost counts as rework, labelled "archived unfinished".
  - [x] The project overview shows rework as a share of total cost, per intent and over time. Rework per release comes with US-1303's release roll-up (decided 2026-11-26 in requirements).
  - [x] An attempt is placed in time by its audit rows, and its tokens come from the readings and the ledger in that window. When a window cannot be placed exactly, the figure is labelled as an estimate and says why.
  - [x] Nothing is written in `aidlc/`. Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Notes:** Rework is not blame. A rejection the person asked for is the workflow working as intended. The view names the cause, not a person.
- **Dependencies:** US-0201, US-0202, US-0209

**US-1302: Savings hints: where the same work could cost less** ✅ Done, for v0.3.2
- As a **developer**, in order to **spend less without losing quality**, I would like **the app to point out spend that could be cut, with what it would save and a link to the setting that changes it**.
- **Epic:** EPIC-13
- **Priority:** High
- **Complexity:** Medium
- **Background:** Asked for 2026-11-18. Harness calls this "optimizable spend". The ledger already has tokens per model, stage and agent, and the cache reads.
- **Acceptance Criteria:**
  - [x] **Given** a stage whose runs use a top-tier model, while its output is small and its runs rarely get rejected, **then** a hint suggests a lighter model for that agent, with the estimated saving from the current price table (US-0211). It links to the agent's model setting (US-0904).
  - [x] **Given** a low share of cache reads in a run compared with the project's usual share, **then** a hint names the run and the likely causes: a fresh session started mid-stage, or a long context.
  - [x] **Given** a stage that needs many more turns than its own median, **then** a hint names it and links to the THADEUS rule pack (US-0212) or to the compact and fresh-session offer (US-0213).
  - [x] Each hint shows how it was worked out, can be dismissed per project, and never changes a setting by itself.
  - [x] Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Dependencies:** US-0204, US-0211, US-0212, US-0904

**US-1303: Cost per story, epic and release** ✅ Done, for v0.3.2
- As a **product owner or team lead**, in order to **know what a feature or a release cost to build**, I would like **intent costs rolled up to the stories, epics and releases they delivered**.
- **Epic:** EPIC-13
- **Priority:** High
- **Complexity:** Medium
- **Background:** Asked for 2026-11-18. Harness calls this "cost per work item", from issue trackers. Here the work items are the stories in `docs/FEATURES.md` and the epic files, and the releases are the `vX.Y.Z` tags.
- **Acceptance Criteria:**
  - [x] **Given** intents that name their stories (in their record, their branch `feat/<story>` or their pull request title), **then** each story shows its cost and tokens, summed over every intent and machine that worked on it (US-0209). Read from the record and a hand link; branch and pull request scanning left out (decided 2026-11-26 in requirements).
  - [x] An epic shows the sum of its stories, and a release shows the sum of the stories it includes, with the split by stage, agent and model, and the rework in it (US-1301).
  - [x] An intent that covers several stories splits its cost evenly between them, and the view says so.
  - [x] An intent that names no story is listed as "not linked to a story", with a way to link it.
  - [x] The epic and story views in the app (EPIC-06) show the cost next to the status. Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Notes:** CSV export of these figures picks up the export deferred in US-0203.
- **Dependencies:** US-0201, US-0209, US-0303, US-0604

**US-1304: Delivery metrics from AI-DLC and git: lead time, release frequency, failure rate and recovery time** 🚧 In progress, for v0.3.2
- As a **team lead**, in order to **see whether the AI work makes delivery faster and safer**, I would like **the four DORA metrics, worked out from the feature docs, the audit, the tags and the pull requests**.
- **Epic:** EPIC-13
- **Priority:** Medium
- **Complexity:** Large
- **Background:** Asked for 2026-11-18. Harness tracks DORA out of the box. For a desktop app that ships by tag (team.md, Deployment), each metric has a clear source here.
- **Acceptance Criteria:**
  - [ ] **Lead time:** from a story's first 🚧 (its intent's start in the audit) to the tag of the release that includes it, per story and as a median per release.
  - [ ] **Release frequency:** `vX.Y.Z` tags per month on `main`.
  - [ ] **Change failure rate:** the share of releases that were marked as a prerelease after publishing, or that were followed by an EPIC-00 fix story for a fault they shipped.
  - [ ] **Time to recover:** from a release marked broken to the tag of the patch that fixes it.
  - [ ] Pull request figures from the platform connection (US-1201): time from open to merge, and review rounds.
  - [ ] Each figure shows its source, and says so when data is missing (for example, no platform connection). Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Dependencies:** US-0303, US-0605, US-1201

**US-1305: Quality signals next to cost** 📋 Planned, for v0.3.2
- As a **developer or team lead**, in order to **see whether cheaper or faster work costs quality**, I would like **each intent and release to show its quality signals beside its cost**.
- **Epic:** EPIC-13
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-18. Harness asks leaders to measure AI's effect on quality and regressions, without naming the metrics. The AI-DLC record names them.
- **Acceptance Criteria:**
  - [ ] Per intent: revision cycles per stage, loop-backs from Build and Test, review findings and whether they were fixed, failed test runs, and "Efter merge med main" findings in `test-results.md`.
  - [ ] Per release: EPIC-00 fix stories that trace back to it, and whether it was marked as a prerelease.
  - [ ] A chart puts cost and quality side by side per intent, so that an expensive and troubled intent stands out.
  - [ ] Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Dependencies:** US-1301, US-1304

**US-1306: The AI share of delivered code** 📋 Planned, for v0.3.3
- As a **team lead**, in order to **know how much of what we ship comes from AI-DLC work**, I would like **each merged pull request, story and release to show how much of its changed code came from AI-DLC work and how much was edited by hand**.
- **Epic:** EPIC-13
- **Priority:** Medium
- **Complexity:** Large
- **Background:** Asked for 2026-11-18. Harness shows "AI code percentage" and the share of AI-assisted pull requests and commits. Here the evidence is the audit's `ARTIFACT_CREATED` and `ARTIFACT_UPDATED` rows, the `Co-Authored-By` trailers on commits, and the diff of each pull request.
- **Acceptance Criteria:**
  - [ ] **Given** a merged pull request, **then** its changed lines are split into "written in AI-DLC work" (files the audit shows an agent writing during the intent) and "edited by hand", with the method shown.
  - [ ] Per story, epic and release: the share of AI-written lines, and the share of pull requests with AI-DLC work in them, over time.
  - [ ] Per harness and model: which tools wrote the delivered code (Claude Code, opencode, Codex, Kiro).
  - [ ] When attribution is uncertain (for example, a file the person and an agent both changed), the line counts as "mixed" and is never guessed.
  - [ ] Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Dependencies:** US-1201, US-1303

**US-1307: Insights for a team: the same figures per person and machine** 📋 Planned, for v0.3.3
- As a **team lead**, in order to **share what works and help where it does not**, I would like **the insights broken down by person and by machine, presented as coaching and not as surveillance**.
- **Epic:** EPIC-13
- **Priority:** Low
- **Complexity:** Medium
- **Background:** Asked for 2026-11-18. Harness names "power users" with a high AI commit velocity. The audit shards already name each machine (US-0209), and git names each committer.
- **Acceptance Criteria:**
  - [ ] Rework, savings, cost per story and AI share (US-1301–US-1306) can be shown per person (git author) and per machine (audit shard).
  - [ ] The default view is the team total. A per-person view is opt-in per project, and each person can see their own figures.
  - [ ] A "good patterns" panel lists the practices behind low rework and low cost (models chosen, plans used, rule pack on), not a ranking of people.
  - [ ] Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Notes:** To decide when the story starts: whether per-person figures need everyone's consent, and whether they are kept local or shared through git.
- **Dependencies:** US-0209, US-1201, US-1301–US-1306
