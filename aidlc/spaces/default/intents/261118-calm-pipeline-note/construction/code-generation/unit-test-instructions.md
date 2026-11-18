# Unit Test Instructions: US-0028 calm pipeline note

## Setup

vitest 5.1.0, already configured. The `renderer` project runs `tests/renderer/**/*.test.jsx` in jsdom with the Swedish locale. Nothing to install.

## Run

```bash
npx vitest run tests/renderer/Pipeline.test.jsx tests/main/i18nKeys.test.js
```

This command runs on the unchanged tree before the first Red step.

## Tests to write (3, in `tests/renderer/Pipeline.test.jsx`)

| Test | Requirement |
|------|-------------|
| No graph and no done stage: no `pipeline-timings-note` | FR1 |
| No graph and one done stage: the note shows "Tidsuppgifter finns bara på den dator som körde arbetet. Status kommer från aidlc-state.md." | FR2, FR4 |
| With `hasGraph`: no note | FR2 (edge) |

`tests/main/i18nKeys.test.js` already checks that `sv.json` and `en.json` hold the same keys (FR4).

## Coverage

The project floor is 80% line coverage. Build and Test checks it on the full suite; this run does not judge it.

## Mocks and data

No mocks. Reuse `stageOf` and `PIPELINE` in the test file; for the "no done stage" case pass a pipeline whose stages are all `not-started` or `in-progress`.
