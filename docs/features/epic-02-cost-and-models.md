# EPIC-02: Cost & Models

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Make the price and the "brains" of AI-DLC work visible. For every intent, stage and agent the console shows what the run cost (tokens and USD) and which model did the work, next to which model each agent is *configured* to use. The goal is that the user can answer "what did this feature cost?", "where does the money go?" and "is the reviewer really running on the cheaper model?" without leaving the app. Read-only, like everything else.

**Stories:** US-0201, US-0202, US-0203, US-0204, US-0205

**Status (2026-11-13):** 📋 Planned.

---

## Data sources

All read-only. Verified against `~/Projects/visinv` (AI-DLC 2.11.3).

| Source | What it holds |
|--------|---------------|
| `aidlc/.aidlc-sessions/usage-ledger.json` | Written by AI-DLC's hooks from the Claude transcripts. `schemaVersion: 3`. `totals`, `byStage`, `byModel`, `byAgent` and `workflows`. Each node has `tokens` (`input`, `output`, `cacheCreate5m`, `cacheCreate1h`, `cacheRead`) and `usd`. `workflows` is keyed `record:<space>/<intent-dir>` (seen: `record:default/legacy`) and nests `byStage`, `byModel`, `byAgent` and `sessions`. Git-ignored, so it exists only on the machine that ran the work. |
| `aidlc config models --show --json --harness <harness>` | The effective model and effort per agent (`data.effective[]`: `agent`, `group`, `model`, `effort`, `modelSource`, `effortSource`). `inherit` means the agent uses the session model. |
| `.claude/agents/aidlc-*-agent.md` frontmatter | The `model:` field, as a fallback when the CLI is not available. |

**The cost is an estimate, not an invoice.** AI-DLC computes `usd` from the token counts in Claude Code's transcripts times a price per token. It shows what the run *would* cost at API prices. On a Claude subscription (Pro, Max or Team) the user pays a fixed fee, so the figure is not what was actually paid. All models are Claude models run through Claude Code. `<synthetic>` is Claude Code's internal marker for messages that did not come from a model call, with 0 tokens. A model with tokens but `usd: 0` (seen for `claude-haiku-5-5`) means the price table has no price for it, so its cost is unknown. It is not free.

Note: the key format of `workflows` and the exact price source AI-DLC uses must be confirmed during requirements analysis.

## Cross-cutting acceptance criteria (all cost stories)

- [ ] Every cost figure is labelled as an estimate ("Uppskattad kostnad (API-pris)"), and an info tooltip explains that it is computed from tokens and is not the subscription bill
- [ ] A model with tokens but no price is shown as "pris saknas", not as 0 USD, and totals that include it are marked as incomplete
- [ ] Tokens are always shown next to USD, since tokens are the measured fact and USD is derived

---

## User Stories

**US-0201: Cost per intent** 📋 Planned
- As a **developer using AI-DLC**, in order to **know what a piece of work cost**, I would like to **see the total cost of each intent in the list and in the detail view**.
- **Epic:** EPIC-02
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] Given a project with `usage-ledger.json`, when the intent list loads, then each intent shows its total cost in USD (2 decimals), taken from `workflows["record:<space>/<dirName>"].totals.usd`
  - [ ] The detail view shows the total plus token counts split into input, output, cache write and cache read
  - [ ] An intent without a ledger entry shows "–" with a tooltip saying cost data is missing. It never shows 0.
  - [ ] A missing or unreadable ledger never breaks the list. The cost column is hidden with a short explanation.
  - [ ] The intent list can be sorted by cost
- **Dependencies:** US-0102, US-0103

**US-0202: Cost breakdown by stage, agent and model** 📋 Planned
- As a **developer**, in order to **see where the money goes**, I would like to **a breakdown of an intent's cost by stage, by agent and by model**.
- **Epic:** EPIC-02
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] A new "Kostnad" tab in the intent detail with three views: per stage (in pipeline order), per agent and per model
  - [ ] Each row shows USD, share of the intent total (%) and tokens, and the largest posts stand out
  - [ ] Each pipeline stage row shows its cost next to its duration
  - [ ] Cache read and cache write are shown separately, because they dominate volume but not price
  - [ ] Values come straight from the ledger. The app does not compute prices itself.
- **Dependencies:** US-0201

**US-0203: Project cost overview** 📋 Planned
- As a **developer**, in order to **follow AI spend for the whole project over time**, I would like to **a project-level cost view**.
- **Epic:** EPIC-02
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] Shows the project total (`totals.usd`) and the split per model and per agent across all intents
  - [ ] Shows cost per intent over time (by the date prefix of the intent), as a simple bar chart
  - [ ] Shows cost per scope (express, feature, bugfix …) as average and total
  - [ ] Can be exported as CSV, to a location the user picks. This is the only write, and it is outside the AI-DLC files.
- **Dependencies:** US-0201

**US-0204: Models per agent: configured and actual** 📋 Planned
- As a **developer**, in order to **know which model each agent sees**, I would like to **a view of every agent's configured model and effort next to the models it actually ran on**.
- **Epic:** EPIC-02
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] The configured model and effort per agent come from `aidlc config models --show --json --harness claude`, run in the project root with the user's login environment. The command is read-only. If it fails, the app falls back to the agent files' `model:` field.
  - [ ] `inherit` is shown as "Sessionens modell". Where the ledger shows which model the main session used, that model is named.
  - [ ] Actual models per agent come from the ledger (`byAgent` combined with each workflow's `byModel`)
  - [ ] An agent configured for one model that ran on another is flagged
  - [ ] Shown both per project (all agents) and per intent (only agents that took part)
  - [ ] The pipeline shows the model next to the agent for each stage, when the ledger has it
- **Dependencies:** US-0103

**US-0205: Live cost while a workflow runs** 📋 Planned
- As a **developer**, in order to **keep an eye on spend while agents work**, I would like to **the cost of an in-flight intent to update live**.
- **Epic:** EPIC-02
- **Priority:** Medium
- **Complexity:** Low
- **Acceptance Criteria:**
  - [ ] The file watcher also watches `aidlc/.aidlc-sessions/usage-ledger.json` and reloads cost when it changes, debounced like other updates
  - [ ] An in-flight intent shows its running cost next to the live indicator
  - [ ] A half-written ledger keeps the last good values (as in FR7.4)
- **Dependencies:** US-0201, US-0107
