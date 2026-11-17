# User Stories: US-0211 Reprice recorded tokens

Persona: P1, the developer who reads the cost view (`personas.md`).

## US1.1 Pick a current price table (Must Have)
As P1, I want the app to price tokens with my own rates when I have them, and with current list prices otherwise, so that one stale table does not decide my figures.
Traces: FR1.1, FR1.2, FR1.3, FR1.6

- **AC1.1.1** Given a project with no override, when its costs load, then each model is priced from the app's table, and from AI-DLC's shipped table only for models the app's table lacks.
- **AC1.1.2** Given `env.AIDLC_MODEL_RATES` in `.claude/settings.local.json` (or else in `.claude/settings.json`), when costs load, then the models in that file are priced from it.
- **AC1.1.3** Given a rates path in the app's project settings, when costs load, then it wins over both settings files.
- **AC1.1.4** Given an override path that is missing or not valid JSON, when costs load, then the next table in the order is used and the view says why.
- **AC1.1.5** Given the app's table, then `sonnet-5-5` cache reads are $0.10/M and `fable-5-2` and `haiku-5-5` have rows.

## US1.2 See where each price came from (Must Have)
As P1, I want the cost view to name the table each model's price came from, so that I know what I am trusting.
Traces: FR1.4, FR1.5, FR2.2

- **AC1.2.1** Given repriced figures, when I open the cost tab, then each model shows its source: the project file, the app's table, or AI-DLC's table.
- **AC1.2.2** Given a `haiku-5-5` cost, then the view says it is priced at the higher prompt-size tier.
- **AC1.2.3** Given audit rows with no 5m/1h cache-write split, then the view says their cache writes are priced as 5m.

## US1.3 Reprice from the stored tokens (Must Have)
As P1, I want USD computed from the token counts already recorded, so that old intents are corrected too and no record is touched.
Traces: FR2.1, FR2.2, FR2.3, NFR1

- **AC1.3.1** Given a ledger node for `sonnet-5-5`, when it is repriced, then its cache reads cost $0.10/M, computed from `input`, `output`, `cacheCreate5m`, `cacheCreate1h` and `cacheRead`.
- **AC1.3.2** Given an audit row with `Tokens By Model` but no cache-write split, when it is repriced, then its cache writes are priced at the 5m rate.
- **AC1.3.3** Given a model with no rate in any table, then its cost stays "pris saknas" / "price missing", and no other row's price is used.
- **AC1.3.4** Given any repricing, then no file under `aidlc/` and no AI-DLC file is written.

## US1.4 Keep the recorded figure first, the current one beside it (Must Have)
As P1, I want the recorded USD to stay the headline, with the current-price figure beside it when they differ, so that history never changes silently.
Traces: FR3.1, FR3.2, FR3.3

- **AC1.4.1** Given recorded $12.40 and current-price $9.80, when I open intent detail, the cost tab (and its per-machine figures), the cost panel or token detail, then I see "recorded $12.40 · at current prices $9.80".
- **AC1.4.2** Given figures that differ by less than $0.01, then only the recorded figure shows.
- **AC1.4.3** Given an intent list row or a chart point whose figures differ, then the row or point shows the recorded figure and its tooltip shows the current-price figure.
- **AC1.4.4** Given the Swedish or English locale, then every new text comes from `t()` in both `sv.json` and `en.json`, in the LCARS look.

## US1.5 Totals add up the same way (Should Have)
As P1, I want totals to sum the repriced figures, so that a project total agrees with its intents.
Traces: FR3.2, NFR2

- **AC1.5.1** Given a project with several intents, when the cost tab shows totals, then the current-price total equals the sum of the intents' current-price figures, with models whose price is missing left out and counted.
- **AC1.5.2** Given a project load, then the rates are read once, and again only when a settings file or the override file changes.

## Dependencies and INVEST notes

- US1.3 needs US1.1 (the table). US1.2, US1.4 and US1.5 need US1.3. The order is US1.1 → US1.3 → US1.2, US1.4, US1.5.
- Each story can be tested on its own against fixture tables and the existing `tests/fixtures/ledger` and `tests/fixtures/cost` data. All five fit in one pull request (story US-0211).
- NFR3 (TDD, 80% coverage) applies to every story and is checked at Build and Test.
