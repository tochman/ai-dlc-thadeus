# Requirements: US-0211 Reprice recorded tokens with a current price table

## Intent analysis

The cost view shows the USD that AI-DLC wrote, so the errors in AI-DLC's price table (`.claude/tools/data/model-rates.json`, "as of 2026-10") stay in every intent recorded so far. The person wants to trust the figures, including for old intents. The app prices the stored token counts itself and shows the result next to the recorded figure, without changing any record. Source: story US-0211 (`docs/features/epic-02-cost-and-models.md`), issue #64, Q1–Q5 in `requirements-analysis-questions.md`.

Type: enhancement, multi-view, standard complexity. Code: `src/main/parsers/ledger.js`, `src/main/parsers/auditCost.js`, the main-side cost readings, and the renderer cost views.

## Functional requirements

**FR1 Price table**
- FR1.1 The app resolves rates **per model** in this order: the project's override file, then the app's own table, then AI-DLC's shipped `.claude/tools/data/model-rates.json`. (Q1: A)
- FR1.2 The override path is read from `env.AIDLC_MODEL_RATES` in `.claude/settings.local.json`, then `.claude/settings.json`. A path set in the app's project settings overrides both. (Q2: C)
- FR1.3 The app's own table holds the current published list prices: `sonnet-5-5` cache read $0.10/M, and rows for `fable-5-2` ($8 / $40, cache read $0.20/M) and `haiku-5-5`.
- FR1.4 `haiku-5-5` is priced at its higher prompt-size tier, so the result is never under-counted, and the view says so. (Q3: B)
- FR1.5 The cost view names the source of each model's rate: the project file, the app's table, or AI-DLC's table.
- FR1.6 An override file that is missing or not valid JSON is skipped, and the view says why. The next table in the order is used.

**FR2 Repricing**
- FR2.1 USD is computed from the stored token counts: for ledger nodes from `input`, `output`, `cacheCreate5m`, `cacheCreate1h` and `cacheRead`, and for audit rows from `Tokens By Model`.
- FR2.2 Audit rows without a 5m/1h cache-write split are priced as 5m, as `auditCost.js` does today, and the view says so.
- FR2.3 A model with no rate in any table keeps "pris saknas" / "price missing". A price is never guessed or borrowed from another model row.

**FR3 Display**
- FR3.1 The recorded USD stays the headline. When the current-price USD differs from it, the current-price figure is shown beside it, for example "recorded $12.40 · at current prices $9.80". (Q4: B)
- FR3.2 This applies wherever USD is shown, totals included: the intent list, intent detail, the cost tab and its per-machine figures, the cost panel, token detail and its chart. (Q5: A)
- FR3.3 Every text goes through `t()`, in Swedish and English, in the LCARS look.

## Non-functional requirements

- NFR1 Nothing under `aidlc/` and no AI-DLC file is written. Repricing is a view only.
- NFR2 Repricing never slows the cost view noticeably. Rates are loaded once per project load and when a settings file changes, never once per row.
- NFR3 Tests are written first (TDD), covering each FR, with 80% line coverage on new code.

## Constraints

- AI-DLC's records and table are read only (team rule, issue #64 point 4).
- The rate-file format is the same as AI-DLC's (`rates.<model>.{input, output, cacheWrite5m, cacheWrite1h, cacheRead}`), with model-key matching as AI-DLC does it (`[1m]`, revision and date suffixes dropped).

## Assumptions

- [assumption] In compact places (intent list rows, chart points), the current-price figure goes in the tooltip rather than inline, so the layout holds. Detail views show both figures inline.
- [assumption] The `haiku-5-5` higher-tier price and the cache-write prices for `fable-5-2` and `haiku-5-5` are taken from the published pricing page at Code Generation, with the date noted in the app's table.
- [assumption] "Differ" means a difference of at least $0.01 after rounding.

## Out of scope

- Correcting AI-DLC's shipped table or the stored records.
- Per-prompt tier pricing for any model, which the stored counts cannot support.
- Editing rates in the app.

## Open questions

None.
