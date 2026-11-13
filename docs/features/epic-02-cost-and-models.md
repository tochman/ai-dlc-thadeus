# EPIC-02: Cost & Models

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Make the price and the "brains" of AI-DLC work visible. For every intent, stage and agent the console shows what the run cost (tokens and USD) and which model did the work, next to which model each agent is *configured* to use. The goal is that the user can answer "what did this feature cost?", "where does the money go?" and "is the reviewer really running on the cheaper model?" without leaving the app. Read-only, like everything else.

**Stories:** US-0201, US-0202, US-0203, US-0204, US-0205

**Status (2026-11-13):** 🚧 Built on `feat/epic02-cost-and-models`, not released. CSV export (US-0203) is deferred.

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

**US-0201: Cost per intent** 🚧 Built, not released
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

**US-0202: Cost breakdown by stage, agent and model** 🚧 Built, not released
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

**US-0203: Project cost overview** 🚧 Built, not released (CSV export deferred)
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

**US-0204: Models per agent: configured and actual** 🚧 Built, not released
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

**US-0205: Live cost while a workflow runs** 🚧 Built, not released
- As a **developer**, in order to **keep an eye on spend while agents work**, I would like to **the cost of an in-flight intent to update live**.
- **Epic:** EPIC-02
- **Priority:** Medium
- **Complexity:** Low
- **Acceptance Criteria:**
  - [x] The file watcher also watches `aidlc/.aidlc-sessions/usage-ledger.json` and reloads cost when it changes, debounced like other updates
  - [x] An in-flight intent shows its running cost next to the live indicator
  - [x] A half-written ledger keeps the last good values (as in FR7.4)
- **Dependencies:** US-0201, US-0107
