# Requirements: US-0208, detailed token view from the side diagram

## Intent analysis

The person watches agents work and wants to see in depth where the tokens go. The small token view (US-0207) shows four meters and a rate waveform for the running intent. Clicking it should open a large view with several detailed charts, live and for finished intents. The cost ledger has totals per stage, agent and model but no timestamps, so the app stores its own readings to draw time history. Enhancement across main (store readings) and renderer (new view). Depth: Minimal. Layout from the approved rough mockups (`ideation/rough-mockups/wireframes.md`).

## Functional requirements

- **FR1 Open and close.** Clicking the small token view, or pressing Enter or Space on it, replaces the intent's main panel with the token detail view [mockup Q1]. Back or Esc returns, and focus goes back to the small view.
- **FR2 Readings stored [Q1, Q3].** While an intent runs, main stores a reading of its token totals per kind on each cost-ledger change, at most one every 30 seconds.
  - **FR2.1** Readings go to `.thadeus/tokens/<intent-dir>.json` in the project, one file per intent, written atomically.
  - **FR2.2** A file holds at most 2000 readings. Beyond that, older readings are thinned (every second one dropped from the oldest half), never all dropped.
  - **FR2.3** A reading is `{at, input, output, cacheWrite5m, cacheWrite1h, cacheRead, usd}`, cumulative for the intent.
- **FR3 Charts [mockups].** The view shows a summary bar (total tokens, dollars, time recorded, LIVE or RECORDED) and five charts:
  - **FR3.1** Tokens over time, stacked per kind: input, output, cache write 5 m, cache write 1 h, cache read.
  - **FR3.2** Token rate over time, in tokens per minute between readings.
  - **FR3.3** By stage (pipeline order), by agent and by model (largest first), from the ledger totals.
- **FR4 Figures and table [mockup Q4].** Hover or focus on a point or bar shows its exact figures. Each chart's frame has a Diagram / Table switch, and the table is a real `<table>` of the same numbers.
- **FR5 Live and finished.** While the intent runs, the charts update on each cost refresh (LIVE). A finished intent shows its stored readings and ledger totals (RECORDED).
- **FR6 Missing data.** A chart without data says why in one sentence instead of drawing zero. Examples: no stored readings (an intent finished before this story), or no ledger entry yet.
- **FR7 Look [mockup Q3].** Charts are built with visx [Q2] and styled as LCARS: theme colours, square corners, bold labels and no grid hairlines. Every series has a text label, never colour alone. Motion follows the animations setting.
- **FR8 Texts.** Every text goes through `t()` in Swedish and English.

## Non-functional requirements

- **NFR1 One new dependency family:** the `@visx/*` packages actually used (for example shape, scale, axis, tooltip, responsive). Nothing else.
- **NFR2 No blocking.** Storing a reading never blocks the cost refresh; a failed write is logged and the next change tries again.
- **NFR3 Accessible.** `h2` for the view and `h3` per chart section, keyboard reach for Back and every switch, and tooltips that also show on focus.
- **NFR4 Size.** A reading file stays under about 200 kB (2000 readings).

## Constraints

- Brownfield: reuse `costOf`/`summarizeLedger` (`src/main/parsers/ledger.js`), the cost refresh and ledger watch (US-0205), `tokensOf`/`formatTokens`, and the theme's motion rules.
- Paths stay inside the project root (`resolveInRoot`); the intent dir name is validated before it becomes a file name.

## Assumptions

- [assumption] `.thadeus/` is not git-ignored here, so `.thadeus/tokens/` files are committed with the project. Each story PR then carries its intent's readings. Reason: Q1 B. Ignoring them later is one `.gitignore` line.
- [assumption] Readings are taken by main whenever the app runs and watches the project, not only while the view is open. Reason: Q3 A, so history has no gaps.
- [assumption] The small view's own 120-sample rate history (US-0207) stays as it is.

## Out of scope

- Prices computed by the app (only the ledger's own `usd`, as US-0202).
- History for intents that finished before this story.
- Exporting the charts.

## Open questions

None.

## Sources

- Initial description: US-0208 in `docs/features/epic-02-cost-and-models.md` [desc]
- Workflow-selected scope: express with mockups (saved as `visual-express`) [scope]
- Answers: `requirements-analysis-questions.md` [Q1] [Q2] [Q3], `../../ideation/rough-mockups/rough-mockups-questions.md` [mockup Q1–Q4]
- Code: `src/renderer/TokenView.jsx`, `src/renderer/tokenFlow.js`, `src/main/parsers/ledger.js`, `src/renderer/IntentDetail.jsx`
