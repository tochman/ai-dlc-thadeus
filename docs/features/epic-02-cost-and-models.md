# EPIC-02: Cost & Models

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Make the price and the "brains" of AI-DLC work visible. For every intent, stage and agent the console shows what the run cost (tokens and USD) and which model did the work, next to which model each agent is *configured* to use. The goal is that the user can answer "what did this feature cost?", "where does the money go?" and "is the reviewer really running on the cheaper model?" without leaving the app. Read-only, like everything else.

**Stories:** US-0201, US-0202, US-0203, US-0204, US-0205, US-0206, US-0207, US-0208

**Status (2026-11-15):** ✅ US-0201–US-0205 and US-0207 released (v0.2.0–v0.2.4; CSV export in US-0203 deferred). ➡️ US-0206 moved to US-0904. 📋 US-0208 planned for v0.2.6. Each story names its release.

---

## Data sources

All read-only. Verified against `~/Projects/visinv` (AI-DLC 2.11.3).

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

**US-0208: Detailed token view from the side diagram** 📋 Planned, for v0.2.6
- As a **developer watching agents work**, in order to **understand in depth where and how the tokens go**, I would like to **click the small token diagram in the side column and get a large view with several detailed diagrams, showing as much of the data as is available**.
- **Epic:** EPIC-02
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for on 2026-11-14. Builds on the live token view (US-0207).
- **Acceptance Criteria:**
  - [ ] Clicking the small token view (`TokenView.jsx`), or pressing Enter or Space on it, opens a large view; Esc or a close button returns to where the person was.
  - [ ] The large view shows several diagrams, each from the ledger's own data: tokens over time per kind (input, output, cache write 5 m and 1 h, cache read), the token rate over time, and the split by stage, by agent and by model.
  - [ ] Each diagram shows the figures behind it on hover or focus, and a table view of the same numbers is one click away.
  - [ ] It updates live while the work runs, like US-0207, and it works for a finished intent too, from the recorded totals.
  - [ ] A diagram whose data is missing says so in one sentence instead of showing zero.
  - [ ] Each series has a text label, not colour alone. Swedish and English texts, and motion follows the animations setting.
- **Dependencies:** US-0207, US-0202
