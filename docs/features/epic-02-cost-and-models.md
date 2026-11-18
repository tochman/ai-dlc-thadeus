# EPIC-02: Cost & Models

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Make the price and the "brains" of AI-DLC work visible. For every intent, stage and agent the console shows what the run cost (tokens and USD) and which model did the work, next to which model each agent is *configured* to use. The goal is that the user can answer "what did this feature cost?", "where does the money go?" and "is the reviewer really running on the cheaper model?" without leaving the app. Read-only, like everything else.

**Stories:** US-0201, US-0202, US-0203, US-0204, US-0205, US-0206, US-0207, US-0208, US-0209, US-0210, US-0211, US-0212, US-0213, US-0214, US-0215

**Status (2026-11-18):** ✅ US-0201–US-0205 and US-0207 released (v0.2.0–v0.2.4; CSV export in US-0203 deferred). ➡️ US-0206 moved to US-0904. ✅ US-0208 released in v0.2.7. ✅ US-0209 released in v0.2.8. ✅ US-0212 released in v0.2.9. ✅ US-0210 released in v0.2.9. ✅ US-0211 released in v0.2.9. ✅ US-0213 released in v0.2.9. ✅ US-0214 released in v0.2.9. 📋 US-0215 planned. Each story names its release.

---

## Data sources

All read-only. Verified against a local reference project (AI-DLC 2.11.3).

| Source | What it holds |
|--------|---------------|
| `aidlc/.aidlc-sessions/usage-ledger.json` | Written by AI-DLC's hooks from the Claude transcripts. `schemaVersion: 3`. `totals`, `byStage`, `byModel`, `byAgent` and `workflows`. Each node has `tokens` (`input`, `output`, `cacheCreate5m`, `cacheCreate1h`, `cacheRead`) and `usd`. `workflows` is keyed `intent:<uuid>`, where the uuid is the intent's `uuid` in `intents.json`; runs from before intent ids sit under `record:<space>/legacy`. Each workflow nests `byStage` (each with its own `byModel` and `byAgent`), `byModel`, `byAgent` and `sessions`. Git-ignored, so it exists only on the machine that ran the work. |
| `aidlc config models --show --json --harness <harness>` | The effective model and effort per agent (`data.effective[]`: `agent`, `group`, `model`, `effort`, `modelSource`, `effortSource`). `inherit` means the agent uses the session model. |
| `.claude/agents/aidlc-*-agent.md` frontmatter | The `model:` field, as a fallback when the CLI is not available. |

**The cost is an estimate, not an invoice.** AI-DLC computes `usd` from the token counts in Claude Code's transcripts times a price per token. It shows what the run *would* cost at API prices. On a Claude subscription (Pro, Max or Team) the user pays a fixed fee, so the figure is not what was actually paid. All models are Claude models run through Claude Code. `<synthetic>` is Claude Code's internal marker for messages that did not come from a model call, with 0 tokens. A model with tokens but `usd: 0` (seen for `claude-haiku-5-5`) means the price table has no price for it, so its cost is unknown. It is not free.

The key format of `workflows` was confirmed during requirements analysis (see above). The app never computes prices itself; it shows the ledger's `usd`.

## Cross-cutting acceptance criteria (all cost stories)

- [x] Every cost figure is labelled as an estimate ("Uppskattad kostnad (API-pris)"), and an info tooltip explains that it is computed from tokens and is not the subscription bill
- [x] A model with tokens but no price is shown as "pris saknas", not as 0 USD, and totals that include it are marked as incomplete
- [x] Tokens are always shown next to USD, since tokens are the measured fact and USD is derived

---

## User Stories

**US-0201: Cost per intent** ✅ Released in v0.2.0
- As a **developer using AI-DLC**, in order to **know what a piece of work cost**, I would like to **see the total cost of each intent in the list and in the detail view**.
- **Epic:** EPIC-02
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] Given a project with `usage-ledger.json`, when the intent list loads, then each intent shows its total cost in USD (2 decimals), taken from `workflows["intent:<uuid>"].totals.usd`
  - [x] The detail view shows the total plus token counts split into input, output, cache write and cache read
  - [x] An intent without a ledger entry shows "–" with a tooltip saying cost data is missing. It never shows 0.
  - [x] A missing or unreadable ledger never breaks the list. The cost column is hidden with a short explanation.
  - [x] The intent list can be sorted by cost (also by date, the default, and by name)
- **Dependencies:** US-0102, US-0103

**US-0202: Cost breakdown by stage, agent and model** ✅ Released in v0.2.0
- As a **developer**, in order to **see where the money goes**, I would like to **a breakdown of an intent's cost by stage, by agent and by model**.
- **Epic:** EPIC-02
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] A new "Kostnad" tab in the intent detail with three views: per stage (in pipeline order), per agent and per model
  - [x] Each row shows USD, share of the intent total (%) and tokens, and the largest posts stand out
  - [x] Each pipeline stage row shows its cost next to its duration
  - [x] Cache read and cache write are shown separately, because they dominate volume but not price
  - [x] Values come straight from the ledger. The app does not compute prices itself.
- **Dependencies:** US-0201

**US-0203: Project cost overview** ✅ Released in v0.2.0 (CSV export deferred)
- As a **developer**, in order to **follow AI spend for the whole project over time**, I would like to **a project-level cost view**.
- **Epic:** EPIC-02
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] Shows the project total (`totals.usd`) and the split per model and per agent across all intents, in a collapsible panel at the top of the intent list
  - [x] Shows cost per intent over time (by the date prefix of the intent), as a simple bar chart
  - [x] Shows cost per scope (express, feature, bugfix …) as average and total
  - [x] Shows the legacy entry (`record:<space>/legacy`) as its own row, "Äldre körningar (utan intent-id)", included in the total
  - [ ] Can be exported as CSV, to a location the user picks. This is the only write, and it is outside the AI-DLC files. **Deferred** to a later round (requirements analysis, Q2).
- **Dependencies:** US-0201

**US-0204: Models per agent: configured and actual** ✅ Released in v0.2.0
- As a **developer**, in order to **know which model each agent sees**, I would like to **a view of every agent's configured model and effort next to the models it actually ran on**.
- **Epic:** EPIC-02
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] The configured model and effort per agent come from `aidlc config models --show --json --harness claude`, run in the project root with the user's login environment. The command is read-only. If it fails, the app falls back to the agent files' `model:` field.
  - [x] `inherit` is shown as "Sessionens modell". Where the ledger shows which model the main session used, that model is named.
  - [x] Actual models per agent come from the ledger (`byAgent` combined with each workflow's `byModel`). The ledger does not cross agent and model, so a model is only attributed where it is certain; otherwise the actual model is shown as unknown.
  - [x] An agent configured for one model that ran on another is flagged
  - [x] Shown both per project (all agents) and per intent (only agents that took part)
  - [x] The pipeline shows the model next to the agent for each stage, when the ledger has it
- **Dependencies:** US-0103

**US-0205: Live cost while a workflow runs** ✅ Released in v0.2.0
- As a **developer**, in order to **keep an eye on spend while agents work**, I would like to **the cost of an in-flight intent to update live**.
- **Epic:** EPIC-02
- **Priority:** Medium
- **Complexity:** Low
- **Acceptance Criteria:**
  - [x] The file watcher also watches `aidlc/.aidlc-sessions/usage-ledger.json` and reloads cost when it changes, debounced like other updates
  - [x] An in-flight intent shows its running cost next to the live indicator
  - [x] A half-written ledger keeps the last good values (as in FR7.4)
- **Dependencies:** US-0201, US-0107

**US-0206: Choose models and effort per agent from the console** ➡️ Moved to [US-0904](epic-09-aidlc-configuration.md) (EPIC-09)
- As a **developer tuning how AI-DLC spends tokens**, in order to **choose which model and effort each agent uses without remembering `aidlc config` commands**, I would like to **a model view where I can see and change model and effort per agent, with the estimated cost of the choice beside it**.
- **Epic:** EPIC-02
- **Priority:** Low
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] A "Modeller" view (from the left arm or the settings view in US-0405) lists every agent with its configured model and effort (`aidlc config models --show --json`), the model it actually ran on (from the ledger, US-0204) and its share of the cost.
  - [ ] Model and effort are chosen from lists of what AI-DLC supports (models known to the installed `aidlc`, `inherit` for the session's model, effort `low` … `max`). The presets `thorough`, `balanced` and `minimal` can be applied to all agents at once.
  - [ ] **Before applying:** the view shows the command it will run (`aidlc config models --agent <name> --model <id> --effort <level> --project --yes`, or `--preset …`) and an estimate of how cost changes, based on this project's ledger history and API prices. It is labelled as an estimate.
  - [ ] **Applying** follows the app's principle: the commands are typed into the visible shell tab for the person to confirm with Enter. The app does not write AI-DLC config files itself. When the config changes, the view reloads.
  - [ ] Scope is chosen explicitly: this project (`--project`) or only for me (`--local`).
  - [ ] Agents that deviate from their configuration (US-0204) are marked, with a suggestion to align them.
- **Dependencies:** US-0204, US-0405


**US-0207: Live token view while the work runs** ✅ Released in v0.2.4 (intent `261114-custom-plans`)
- As a **developer watching agents work**, in order to **see how fast the work burns tokens and what kind**, I would like to **a live view of input, output and cache tokens with the token rate over time**.
- **Epic:** EPIC-02
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for on 2026-11-14 for v0.2.4. The style follows the reference screenshot `Screenshot 2026-11-14 at 08.57.27.png`: glowing bar meters with a level scale, and a waveform. The screenshot guides layout, shape and colour only (FR9.5).
- **Acceptance Criteria:**
  - [x] For the running intent, input, output, cache write and cache read tokens show as glowing bar meters with a level scale and the figure beside each. They come from the intent's `workflows` node in `usage-ledger.json`.
  - [x] A waveform shows the token rate over time, computed from the change between ledger updates.
  - [x] It updates live when the ledger changes, debounced like the other updates (US-0205).
  - [x] A missing or half-written ledger keeps the last good values and says so in one sentence. Figures are the ledger's own.
  - [x] Each meter has a text label, not colour alone. Swedish and English texts, and motion follows the animations setting.
- **Notes:**
  - **Where.** `src/renderer/TokenView.jsx` sits in the intent's readout column, under the cost (`IntentDetail.jsx`). The numbers come from `src/renderer/tokenFlow.js`: `tokensOf`, `pushSample` (the last 120 readings, a rate in tokens per minute, a reset on a lower total) and `meterLevel` (10 segments on a 1/2/5 × 10ⁿ scale shared by the four meters).
  - **Source.** The tokens are the ledger's own, read through the existing `project:cost` summary (`costOf` in `src/main/parsers/ledger.js`). No new watcher.
  - **Limit.** The readout column is hidden in windows narrower than 1280 px, and the view with it.
  - **Tests.** `tests/renderer/tokenFlow.test.jsx`, `tests/renderer/TokenView.test.jsx`.
- **Dependencies:** US-0201, US-0205

**US-0208: Detailed token view from the side diagram** ✅ Released in v0.2.7
- As a **developer watching agents work**, in order to **understand in depth where and how the tokens go**, I would like to **click the small token diagram in the side column and get a large view with several detailed diagrams, showing as much of the data as is available**.
- **Epic:** EPIC-02
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for on 2026-11-14. Builds on the live token view (US-0207).
- **Acceptance Criteria:**
  - [x] Clicking the small token view (`TokenView.jsx`), or pressing Enter or Space on it, opens a large view; Esc or a close button returns to where the person was. (It replaces the intent's main panel; a finished intent opens it from a "Tokens ›" button.)
  - [x] The large view shows several diagrams: tokens over time per kind (input, output, cache write 5 m and 1 h, cache read), the token rate over time, and the split by stage, by agent and by model. (Time history comes from readings the app stores in `.thadeus/tokens/`, since the ledger has no timestamps; the splits come from the ledger.)
  - [x] Each diagram shows the figures behind it on hover or focus, and a table view of the same numbers is one click away. (Decided at the mockup gate: the over-time chart has Diagram / Table; the splits have Tokens / $ with their figures beside each bar.)
  - [x] It updates live while the work runs, like US-0207, and it works for a finished intent too, from the recorded totals.
  - [x] A diagram whose data is missing says so in one sentence instead of showing zero.
  - [x] Each series has a text label, not colour alone. Swedish and English texts, and motion follows the animations setting.
- **Notes:** Built on the plan `visual-express` (intent `261115-token-detail-view`). Visual mockups: https://claude.ai/artifact/WrphyHBekrup5wdVzwi8Yt (private). Charts with visx. Known gap: the way in sits in the right column, which is hidden below 1280 px window width.
- **Dependencies:** US-0207, US-0202

**US-0209: An intent's cost counts every machine that worked on it** ✅ Released in v0.2.8
- As a **developer who works on a project from more than one machine**, in order to **see what an intent really cost**, I would like **the app to add up the cost recorded on every machine, not only this one**.
- **Epic:** EPIC-02
- **Priority:** High
- **Complexity:** Medium
- **Background:** [Issue #56](https://github.com/tochman/aidlc-dash/issues/56), 2026-11-16. Cost comes only from `aidlc/.aidlc-sessions/usage-ledger.json` (`LEDGER_PATH` in `src/main/projectService.js`, `src/main/parsers/ledger.js`), which is gitignored and built from this machine's Claude Code transcripts. On visinv the local ledger had 9 of 31 intents ($274.32). The committed audit shards (`<record>/audit/<host>-<clone-id>.md`) carry a cost rollup on every `STAGE_COMPLETED` (`Tokens In`, `Tokens Out`, `Tokens By Model`, `Tokens By Agent`, `Cost USD`), $1,231.08 for all 31. They travel with git, but the app does not read them.
- **Acceptance Criteria:**
  - [x] On a fresh clone with no `usage-ledger.json`, an intent's cost equals the sum of its `STAGE_COMPLETED` rollups across all of its audit shards.
  - [x] With a local ledger, the total is the audit rollups plus the ledger cost not yet rolled up, counted once (test: one stage on machine A, one on machine B, both shards present).
  - [x] `WORKFLOW_COMPLETED` totals are never added to the stage rows (they are the sum of them).
  - [x] Cost outside stages from another machine shows after `git pull`, once that machine's snapshot file exists.
  - [x] The cost view says which machines contributed, and marks a total as partial when only the local ledger was there.
  - [x] The committed files hold only tokens, model, agent, USD and ids: no transcript text, personal data or secrets.
  - [x] Every text goes through `t()` in Swedish and English.
- **Notes:** The issue's proposal, in order: (1) read the `STAGE_COMPLETED` rollups from every shard; (2) merge with the local ledger keyed by intent, stage, attempt and clone, so a rolled-up stage is not counted twice; (3) a per-clone totals snapshot, for example `<record>/usage/<host>-<clone-id>.json`, for cost outside stages (skipped stages, work after the workflow), written at stage completion, park and workflow end; (4) a one-time backfill of each machine's ledger into its snapshot; (5) show the sources. Who writes the snapshot (AI-DLC's usage tool or the app) is open: the app must not write engine-owned files. Example gap: `261116-epic29-k3-revenue-benefi`, ledger $40.70 against $32.58 in stage rows.
- **Built (2026-11-16, express intent `261116-cross-machine-cost`):** the app writes the snapshot itself, outside AI-DLC's folders, at `.thadeus/usage/<host>-<clone-id>.json` (commit it; the first write is the backfill). Only the last `STAGE_COMPLETED` per stage and Unit counts, because repeated rows are running totals. This machine (`aidlc/.aidlc-clone-id`) uses its ledger instead of its own shard; another machine counts the larger of its snapshot and its shard rows. "Partial" means some machine counts stage rows only. Known shortcuts: audit cache writes count as 5m; a machine with no shard yet is named from `os.hostname()`.
- **Dependencies:** US-0201, US-0202

**US-0210: Ask to switch to a stronger model profile when a critical intent starts, and switch back when it ends** ✅ Released in v0.2.9
- As a **developer who pays for every agent run**, in order to **use the expensive model only where a mistake costs more than tokens**, I would like **the app to ask me, when an intent starts on a plan I marked as critical, whether to switch to my stronger model profile, and to switch back to my economy profile when that intent is done**.
- **Epic:** EPIC-02
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for on 2026-11-17 in visinv. The developer agent was 44 % of one project's cost. Models can only be set per agent (`aidlc config models`), not per plan or stage, and AI-DLC's own hooks belong to the framework, so start and end hooks cannot live there. `aidlc config models` can already save and load named sets (`--save-as <name>`, `--from <name>`), and a change applies from the next step, so switching right after an intent is created is in time for its first stage. The app already reads `intents.json` and `aidlc-state.md`.
- **Acceptance Criteria:**
  - [x] In the project's settings the person picks which plans (scopes) are critical, and which saved model profile is "critical" and which is "economy".
  - [x] When a new intent appears on a critical plan, the app asks once: switch to the critical profile? Yes runs `aidlc config models --from <critical> --project --harness <harness> --yes`; No changes nothing.
  - [x] When that intent is completed or archived, the app switches back to the economy profile, or asks first if the person chose that.
  - [x] An intent on a plan not marked critical gets no question.
  - [x] The app shows which profile is active, and the command's own output after each switch.
  - [x] If the command fails (for example a refused setup), the app shows its message and changes nothing else.
  - [x] Every text goes through `t()` in Swedish and English.
- **Notes:** Until this exists, the assistant asks at intent start in visinv. Open: which profile counts as active when two intents run at the same time, one critical and one not (proposal: critical wins until the last critical intent ends).
- **Dependencies:** US-0204, US-0904

**US-0211: Reprice recorded tokens with a current price table** ✅ Released in v0.2.9 ([#64](https://github.com/tochman/aidlc-dash/issues/64))
- As a **developer who reads the cost view**, in order to **trust the figures for old intents too**, I would like **the app to compute USD from the stored token counts with a current price table, and to show the recorded figure next to it when the two differ**.
- **Epic:** EPIC-02
- **Priority:** High
- **Complexity:** Medium
- **Background:** Reported on 2026-11-17 in issue #64. The app shows the `usd` that AI-DLC wrote, so mistakes in AI-DLC's price table (`.claude/tools/data/model-rates.json`, "as of 2026-10") remain in every intent recorded so far: `sonnet-5-5` cache reads at $0.20/M instead of $0.10/M; `fable-5-2` and `haiku-5-5` missing. In this repository about two thirds of the cost is cache reads (about 5 billion tokens on `opus-5-5`), so the cache-read price matters most. This replaces the rule "the app never computes prices itself" (Data sources): the app still never writes a price anywhere.
- **Acceptance Criteria:**
  - [x] The price table comes from the project's `AIDLC_MODEL_RATES` file when it is set, otherwise from AI-DLC's shipped table, otherwise from the app's own table, and the cost view says which one it used.
  - [x] An intent whose ledger used `sonnet-5-5` shows cache reads at $0.10/M, from the stored token counts.
  - [x] A `fable-5-2` or `haiku-5-5` intent gets a cost instead of "pris saknas".
  - [x] When the recorded and the repriced USD differ, both are shown ("recorded $12.40 · at current prices $9.80").
  - [x] Audit rows without a 5m/1h cache-write split are priced as 5m, as `auditCost.js` does today, and the view says so.
  - [x] A model with no price in any table stays "pris saknas". It is never guessed.
  - [x] Nothing in `aidlc/` is written.
- **Dependencies:** US-0201, US-0209

**US-0212: A THADEUS rule pack on top of AI-DLC to cut token cost** ✅ Released in v0.2.9
- As a **developer or team that pays for every run**, in order to **spend less on each intent without changing AI-DLC**, I would like **to switch on a short set of cost rules that the app keeps in the project's AI-DLC memory files, and that every stage and agent then follows**.
- **Epic:** EPIC-02
- **Priority:** High
- **Complexity:** Medium
- **Background:** Asked for on 2026-11-17. The app must not change AI-DLC or drift from it as published on GitHub. AI-DLC builds the rules for each stage from whole files with fixed names in `aidlc/spaces/<space>/memory/`: `org.md`, `team.md`, `project.md` and `phases/<phase>.md` (`resolveRulesForStage`, `.claude/tools/aidlc-graph.ts`). Those files belong to the project, and their rules also reach the delegated agents. A file of its own (`thadeus.md`) would never be read, so the pack is a marked block inside those files. Across this repository's intents, `main` was 57% of the cost and the developer agent 36%.
- **Acceptance Criteria:**
  - [x] In the project's settings the person turns the pack on or off and can edit its lines. The app writes only between `<!-- thadeus:cost-rules:start -->` and `<!-- thadeus:cost-rules:end -->`, shows a diff first, and leaves everything outside the markers unchanged.
  - [x] General rules go in `project.md`; rules for one phase go in that phase's file (for example targeted tests in `phases/construction.md`), so they cost context only there.
  - [x] The first pack holds: `main` delegates reading and writing source code to the developer agent and keeps only its short report; agents report in a few lines, without file dumps; during the TDD loop only the test being worked on runs, the full suite once before Build and Test is approved; never read `node_modules`, lock files, `dist`/`build` or large logs.
  - [x] The pack is short (a handful of lines), because the memory files are read again on every stage.
  - [x] No rule contradicts the layers above. The app warns when a line clashes with a rule in `team.md` (for example "never run the full suite" against "suite green before merge").
  - [x] After writing, the app runs `aidlc engine graph compile` and shows its output; on a failure it puts the file back as it was.
  - [x] No AI-DLC file outside the memory files is written.
  - [x] Every text goes through `t()` in Swedish and English, in the LCARS interface.
- **Notes:** Rules are text the model reads, not enforcement. Anything that must happen at a set moment, such as starting a fresh session, belongs to US-0213.
- **Dependencies:** US-0901

**US-0213: Offer to compact or start a fresh session, from a dialog, in Claude Code and opencode** ✅ Released in v0.2.9 (not yet released)
- As a **developer running long intents**, in order to **stop paying for the same long context on every turn**, I would like **the app to open a dialog when the context grows too large, when a stage is done, or at a gate, and on my answer send `/compact` or start a fresh session in the agent tab**.
- **Epic:** EPIC-02
- **Priority:** High
- **Complexity:** Large
- **Background:** Asked for on 2026-11-17. The cost comes from context length times the number of turns: cache reads are about two thirds of this repository's cost. AI-DLC keeps its state on disk and resumes from `aidlc-state.md`, and its own `SessionStart` hook injects the resume context, also after a compaction. So a fresh session at a stage boundary loses nothing. A Claude Code hook cannot run `/compact` or `/clear` itself, but the app owns the agent tab's terminal and can type them. Both harnesses have the same commands: `/compact` (opencode also `/summarize`) and `/clear` (opencode also `/new`), and both resume with `/aidlc`. The hook only reports the context size. The dialog and the hooks reuse US-0506: its dialog channel, and its installer with a preview (`src/main/agentHooks.js`, `.thadeus/hooks/`, `.opencode/plugins/`), next to AI-DLC's hook entries, which are never changed.
- **Acceptance Criteria:**
  - [x] Claude Code: a THADEUS `Stop` entry reports the context size of the last request (input + cache read + cache write, from the transcript) and never blocks the stop. opencode: the THADEUS plugin reports the same from the message's token usage. Both install, update and remove through the US-0506 preview.
  - [x] The dialog opens at three moments: the context passes the threshold (default 150k tokens); a stage is completed (`STAGE_COMPLETED` in the audit); AI-DLC waits at a gate. It shows the context size and what one turn costs at that size.
  - [ ] It offers: **Compact** (sends `/compact` with an AI-DLC instruction), **Fresh session** (sends `/clear`, then `/aidlc`), **Not now**. At a gate, Fresh session says that AI-DLC will show the gate again in the new session.
  - [ ] The compact instruction keeps the current intent, stage and Unit, the open decisions and the files left to change, and drops file contents and test output. In Claude Code a THADEUS `PreCompact` entry prints the same instruction, so an automatic compaction uses it too.
  - [x] The app sends a command only when the agent is idle: no tool or dispatched agent is running, no question or permission is waiting, and the person is not typing. Otherwise the choice waits until it is idle.
  - [x] Per project the person sets the threshold and turns each of the three moments on or off. "Not now" for the threshold asks again only after another 50k tokens.
  - [x] Claude Code: the app can also start `claude` with `CLAUDE_CODE_AUTO_COMPACT_WINDOW` set to the threshold, so Claude Code compacts earlier by itself. Off by default; nothing is written for it.
  - [x] The console shows each action with the context size before and after.
  - [x] Nothing in `aidlc/` and no AI-DLC hook entry is written.
  - [ ] Every text goes through `t()` in Swedish and English, in the LCARS interface.
- **Notes:** To be checked in the first design stage: that `/aidlc` in a fresh session shows a waiting gate again and accepts the approval (AI-DLC's human-presence guard), and how a gate is recognised (a waiting question in the US-0506 channel, or the state file). Autonomous Construction rarely goes idle, because AI-DLC's `continue-workflow` `Stop` hook keeps it going, so there only the threshold moment may apply. An "automatic" mode without a dialog can come later, once the dialog has shown which answers people pick.
- **Implementation (Code Generation, 2026-11-17):** Claude Code gets four new THADEUS entries through the US-0506 preview: `SessionStart` (`session`), `Notification` (`notify`), `PreCompact` (`precompact`, prints the instruction the app wrote into the session folder) and `PostCompact` (`postcompact`). Every report-only entry (`answered`, `reply`, `session`, `notify`, `postcompact`) is `"async": true`; `question`, `permission` and `PreCompact` stay synchronous. An install from v0.2.8 reads as out of date and updates through the preview. The size comes from the transcript the `Stop` payload names (`src/main/contextSize.js`); `background_tasks` at a stop means not idle. opencode: the plugin reports `session.created` (main chat only), `session.status`, `session.idle` (fallback), `session.usage.updated` and `session.compaction.ended`, and adds the instruction through `ctx.session.hook('compaction')` when it exists. Decisions live in `src/main/sessionHandoff.js`; the page is `HandoffPage` in `AgentDialog.jsx`, typed through `sendHandoff` in `terminalControl.js`; settings in Configuration › Agent.
- **Build and Test (2026-11-17, intent `261117-session-handoff-dialog`):** 1796/1796 tests, 92.19% lines. Fresh session sends `/aidlc --resume` (decided at requirements). Three criteria stay open until the manual checks in the running app, owed before the v0.2.9 tag: Fresh session shows a waiting gate again (OQ1), the PreCompact instruction reaches the compaction, and the LCARS look by eye. Real opencode 2.1.4 events are checked by hand too.
- **Dependencies:** US-0506, US-0207, US-0212

**US-0214: The token view shows the main session's work, and its chart can hide series from the legend** ✅ Released in v0.2.9
- As a **developer watching an intent in the token view**, in order to **see what is working right now and read the series I care about**, I would like **Agent progress to show the main session's activity too, and the "Tokens over time" chart to let me hide and show series by clicking them in the legend**.
- **Epic:** EPIC-02
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for on 2026-11-17, with screenshots of `261117-release-planning-sync`. Agent progress said "No agents are working in this intent right now" while the main session was working through the stages, because only dispatched agents show there. In "Tokens over time", cache reads (about 30 M) dwarf input and output, so the other series are flat lines at the bottom, and the legend (input, output, cache write 1 h, cache write 5 m, cache read) is a label only. Updated 2026-11-17 22:33, with a screenshot of `261117-session-handoff-dialog`: agent activity is very often not shown at all. A dispatched `aidlc-developer-agent` had been running for 18 minutes (Claude Code's own footer: "Running agentHooks tests after fixture updates", 308.2k tokens), while Agent progress said "No agents are working in this intent right now". So the dispatched agents are missed too, not only the main chat. Reading activity from the transcripts is not reliable enough; the hook events Claude Code and opencode send are (checked against both harnesses' docs on 2026-11-17, see Notes).
- **Acceptance Criteria:**
  - [x] **Given** a dispatched agent is working on the intent, **when** I open the token view, **then** Agent progress shows its row (agent type and what it is doing now) within 2 seconds of its start, and removes it within 2 seconds of its end. The screenshot case (a developer agent running while the view says none) is a test.
  - [x] **Given** the main Claude chat (the conversation in the agent tab, not a dispatched subagent) is working on the intent, **when** I open the token view, **then** Agent progress shows a "Main" row for that chat with what it is doing now (for example running a tool, writing, or waiting for my answer), next to any dispatched agents. "No agents are working" shows only when neither the main chat nor any agent is.
  - [x] Each row shows one of: running a tool (with its name), writing, thinking (opencode), waiting for me, idle, or stopped on an error (with the reason). The state comes from hook events, not from guessing in the transcript.
  - [x] Main chat and agents are told apart: Claude Code by `agent_id` on subagent events, opencode by `parentID` on the child session.
  - [x] The hooks only report: they never block or slow the agent (Claude Code entries are `async`; the opencode plugin's handlers are fire-and-forget), and they install, update and remove through the US-0506 preview, beside AI-DLC's entries, which are never changed.
  - [x] When the app's hooks are not installed or out of date, Agent progress says so and offers the update, and it falls back to today's reading. It never shows "No agents are working" as if that were known.
  - [x] **Given** the "Tokens over time" chart, **when** I click a series in the legend (or press Enter or Space on it), **then** that series is hidden or shown again, and its legend entry looks switched off.
  - [x] The y-axis rescales to the series still shown, so hiding cache read makes input and output readable.
  - [x] At least one series always stays shown: the last one cannot be hidden.
  - [x] The hover box and the Table view show only the series that are shown.
  - [x] The choice is remembered per project while the app runs.
  - [x] Legend entries are buttons with `aria-pressed`, and each series keeps its text label, not colour alone.
  - [x] Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Notes:** Open: whether the other diagrams (rate, splits by stage, agent and model) get the same legend toggles (proposal: yes, wherever a diagram has more than one series), and how the main chat's activity is read (decided 2026-11-17: "Main" is the main Claude chat; proposal: from its transcript, the same source as US-0207's live view). Built on US-0208's view (`TokenDetail.jsx`, `AgentProgress.jsx`, visx). Updated 2026-11-17: activity is read from hook events, reported through the US-0506 channel that US-0213 extends. Start by finding why today's reading missed the running developer agent.
  - Claude Code (all 33 events confirmed in its hooks reference):

    | State | Starts | Ends |
    |---|---|---|
    | Running a tool | `PreToolUse` | `PostToolUse`, or `PostToolUseFailure` (same `tool_use_id`) |
    | Writing | `MessageDisplay` | `MessageDisplay` with `final: true` |
    | Waiting for me | `PermissionRequest`, `AskUserQuestion`, `Elicitation`, `Notification` | the matching answer event |
    | Idle (main chat) | `Stop` | `UserPromptSubmit` |
    | Agent alive | `SubagentStart` | `SubagentStop` |
    | Error | `StopFailure` | the next prompt |

    Not stated in the docs: whether `MessageDisplay`, `Notification` and `StopFailure` fire inside subagents, and how an interrupt shows (`Stop` does not fire then).
  - opencode 2.1.4 (V2 event API; the V1 names in older guides are out of date):

    | State | Event |
    |---|---|
    | Working or idle | `session.status` (`busy`, `idle`, `retry`) |
    | Tool | `session.tool.input.started` (carries the name; later tool events carry only the call id) → `session.tool.success`, or `session.tool.failed` |
    | Writing or thinking | `session.text.*`, `session.reasoning.*` |
    | Waiting for me | `permission.asked`, `form.created` |
    | Error | `session.execution.failed`, `session.execution.interrupted` (with its reason) |
    | Agent or main chat | `session.created`, where `parentID` set means a child session |
    | Tokens | `session.usage.updated` |
- **Implementation (Code Generation, 2026-11-18):** Why the developer agent was missed: the app in the screenshot was v0.2.8, whose `workingAgents` showed nothing while AI-DLC's inflight file was empty, and Claude Code's own helper agents (logged as `Agent Type: unknown`) empty it. US-0025 already removed that gate; the screenshot's audit is now a regression test. Claude Code gets nine async entries (`pretool`, `posttool`, `toolfail`, `agentstart`, `agentstop`, `prompt`, `message`, `stopfail`, `asking`), one installer kind per hook event, which `dialog.sh` writes as the one channel kind `activity`. An install from US-0213 reads as out of date. The adapters keep only identifier-shaped fields. The pure model is `src/shared/agentActivity.js`, with idle after 30 s quiet when no tool runs. The store pushes `agent:activity` within 250 ms. Agent progress shows the hook rows for a live intent when every used harness's hooks are current, and otherwise a notice with Install or Update over the audit rows. The legend entries of Tokens over time and of each split card are toggle buttons; the rate follows the over-time choice, and the choice is kept per project and diagram while the app runs.
- **Dependencies:** US-0207, US-0208, US-0213 (its hook kinds and channel)

**US-0215: Token diagrams and figures for finished intents** 📋 Planned
- As a **developer looking back at finished work**, in order to **see how a past intent used its tokens and compare it with others**, I would like **the token view of a finished intent to show the same diagrams and figures as a live one: tokens over time, the rate, and the splits by stage, agent and model**.
- **Epic:** EPIC-02
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for on 2026-11-17. The time history in the token view comes from readings the app records in `.thadeus/tokens/` while it watches a running intent (US-0208), so only 11 of the 39 intents have any. An intent that finished before v0.2.7, or ran while the app was closed, has no history: its "Tokens over time" and rate diagrams are empty, and only the ledger's totals are left. Claude Code's transcripts hold every model call with its timestamp and token counts, and the ledger's `workflows["intent:<uuid>"].sessions` names the sessions that belong to the intent, so the history can be rebuilt after the fact.
- **Acceptance Criteria:**
  - [ ] **Given** a finished intent with recorded readings, **when** I open its token view, **then** every diagram shows its whole run, from the first reading to the last, without the live mode's 120-reading window.
  - [ ] **Given** a finished intent with no readings, **when** I open its token view, **then** "Tokens over time" and the rate are rebuilt from the timestamps and token counts in its sessions' transcripts, and the view says they were rebuilt from the transcripts.
  - [ ] **Given** neither readings nor transcripts (for example, work done on another machine), **then** the view shows the ledger's totals and splits, and says in one sentence that no time history exists on this machine. It never shows an empty chart as if nothing was used.
  - [ ] A figures strip shows the run's totals: tokens by kind, estimated cost (labelled as an estimate), duration, peak rate, and the share of cache reads.
  - [ ] The figures agree with the ledger's totals for the intent, or the difference is shown and explained (for example, sessions the ledger counts that are not on this machine).
  - [ ] Rebuilding reads the transcripts only and writes nothing in `aidlc/` or `.thadeus/`. A rebuilt history is kept in memory while the app runs, so reopening the view is fast.
  - [ ] Every text goes through `t()` in Swedish and English, in the LCARS look.
- **Notes:** Decided 2026-11-17: a rebuilt history is not saved as readings in `.thadeus/tokens/`; the transcripts stay the source, and nothing is written for a past intent. Decided 2026-11-17: comparing several intents side by side is a later story, not part of this one. Transcripts are local to the machine that ran the work: a teammate's intent has the ledger totals only (see US-0209).
- **Dependencies:** US-0208, US-0209
