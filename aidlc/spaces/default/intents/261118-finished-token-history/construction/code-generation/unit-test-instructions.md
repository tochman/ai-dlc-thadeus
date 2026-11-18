# Unit Test Instructions: US-0215

## Framework

vitest 5.1.0, already set up in the repository: project `main` (node) for `tests/main/**/*.test.js`, project `renderer` (jsdom, Swedish locale) for `tests/renderer/**/*.test.jsx`. No new setup or dependency.

## Commands (this story only)

Runner check before the first Red step:

```bash
npx vitest run tests/main/contextSize.test.js
```

Main and chart tests:

```bash
npx vitest run tests/main/tokenHistory.test.js tests/main/contextSize.test.js tests/main/tokenChart.test.js
```

View tests:

```bash
npx vitest run tests/renderer/TokenDetail.test.jsx tests/renderer/TokenDetailChartSize.test.jsx
```

## Tests

- `tests/main/tokenHistory.test.js` (new, about 12): transcript calls with one call per message id, broken and non-assistant lines; confinement and missing file; stage windows with park/unpark and the no-stage-events fallback; wall-clock; rebuild inside windows only, cumulative; source choice recorded / rebuilt / none; memory cache; gap reasons; no writes.
- `tests/main/tokenChart.test.js` (4 more): `runFigures` kinds, working time, peak rate, cache-read share, unknown as null.
- `tests/renderer/TokenDetail.test.jsx` (6 more): 300 readings all shown; rebuilt note; no-history view with ledger totals; "–" and the estimate label; gap line; bare-array answer still works.

## Coverage

The project floor is 80% line coverage (team rule). No coverage tool is set up yet, so it is not measured here; Build and Test checks the floor on the full suite once it exists. The new module aims for full line coverage of its pure functions.

## Mocking and test data

- Transcripts and audit events are inline strings and arrays in the tests; files go in a temp folder made by the test (`fs.mkdtemp` under `os.tmpdir()`) with a fake projects folder, removed after.
- `readReadings` and the ledger are passed in as plain objects; no IPC in main tests.
- Renderer tests stub `window.bridge.getTokenReadings` as today, returning the new `{ source, readings, wallMs, gap }` object (or a bare array for the old shape).
- "Writes nothing" is checked by listing the temp project's `aidlc/` and `.thadeus/` before and after.
