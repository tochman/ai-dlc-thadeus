# Code Summary: US-0208, detailed token view

## What was built

- **Readings (FR2), `src/main/tokenReadings.js`.** `readingOf` and `addReading` are pure: at most one reading per 30 s, none when nothing changed, and past 2000 the oldest half is thinned. `readReadings`/`recordReading` use `.thadeus/tokens/<dir>.json`, written with `writeAtomic` inside the root. The dir name is checked (`^[\w.-]+$`, no `..`).
- **Ledger.** `intentCost` also returns a raw `tokens` object with `cacheCreate5m` and `cacheCreate1h`. This is additive, and `cacheWrite` is unchanged.
- **IPC.** `project:cost` records a reading for each in-flight intent without waiting for it, and logs a failure (NFR2). `tokens:readings` and the preload's `getTokenReadings` are new.
- **Chart helpers, `src/renderer/tokenChart.js`.** `elapsedLabel`, `stackSeries`, `rateSeries` and `splitRows` (top 12 plus "other").
- **View, `src/renderer/TokenDetail.jsx`.** Inside the existing `Frame`:
  - ‹ Back and an Antonio title with chips;
  - Tokens over time (visx `Area` layers, grid, axes, coral marker, tooltip on hover and focus, arrow keys, Esc), with a Diagram / Table switch;
  - By stage, agent and model cards with a Tokens / $ switch;
  - a right column with Mode, Tokens, Cost, Recorded, the stepped rate line and Model;
  - dashed one-sentence empty states.
- **Wiring.** `TokenView` is one button (`role="button"`, click, Enter, Space). A finished intent gets a small "Tokens ›" button in the readout column. `IntentDetail` swaps its main panel and gives focus back on Back or Esc.
- **Style and motion.** `.token-detail-*` and `.token-kind--*` in `theme.css`, plus `--steel-mid`. With full motion only:
  - the bars sweep and the parts cascade in on open;
  - the areas draw in from the left and the split bars grow from zero;
  - bar changes ease over 300 ms, and the live rate line glows.
  Elements stay mounted across live refreshes, so nothing replays.

## Decisions and deviations

- The areas use visx `Area` over the stacks that `stackSeries` computes, not `AreaStack`. The split bars use visx `Bar` segments, not `BarStack`. Both keep the numbers pure and tested.
- The split cards show four kinds. The ledger's per-stage, per-agent and per-model rows merge the two cache writes.
- A finished intent has no live small view (US-0207), so it gets its own small "Tokens ›" button.
- The readout column, and with it the way into the view, is still hidden below 1280 px wide (existing CSS).
- A new reading adds a point to the paths, so the over-time areas snap to it instead of easing (`ponytail:` comment).

## Tests

- `tests/main/tokenReadings.test.js` (6)
- `tests/main/tokenChart.test.js` (5)
- `tests/renderer/TokenDetail.test.jsx` (9)
- `tests/main/theme.test.js` (+2)

`tests/main/i18nKeys.test.js` covers the new keys in both locales (FR8).
