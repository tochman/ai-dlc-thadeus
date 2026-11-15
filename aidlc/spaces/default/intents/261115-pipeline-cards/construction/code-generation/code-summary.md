# Code Summary — US-0411 Pipeline stages as LCARS cards

## Files

- `src/main/parsers/runtimeGraph.js` — per stage `unitsApproved` / `unitsSeen` from `instances`.
- `src/main/parsers/pipeline.js` — per stage `units: { approved, total } | null` (total = `bolt_dag` units, else instances) and `failed`.
- `src/renderer/Pipeline.jsx` — exports `levelBar`; `StageBlock` is an `lcars-card stage-card` with head (name), body (number, status, flags, model/cost), foot (agent short name, duration, `role="img"` level bar). Classes `status-*`, `is-current`, `is-muted`, `is-mismatch`, `is-failed`.
- `src/renderer/theme.css` — `stage-block` rules replaced by `stage-card` rules: steel fill for current, coral fill for awaiting approval, grey outline for done, muted for skipped, amber for mismatch/failure; glow via `is-breathing` / `is-attn`, so Dämpad/Av apply.
- `src/shared/locales/{sv,en}.json` — `pipeline.failed`, `pipeline.levelUnits`, `pipeline.levelDone`, `pipeline.levelTodo`.
- Tests: `tests/main/parsers.test.js` (+3), new `tests/renderer/Pipeline.test.jsx` (7).

## Decisions and deviations from the plan

- `failed` excludes outcome `pending` as well as `approved`: the runtime graph uses `pending` for a stage still running. This narrows the requirements' assumption.
- A failed stage shows the flag "Misslyckades ({outcome})" (`pipeline.failed`).
- A stage that is current only by the state file's current-stage pointer now breathes too (FR4).
- `.status-failed` keeps a style, mapped to the amber outline.
- The FR5 click test passed at Red, because the behaviour already existed. It guards a regression.
- Renderer tests use plain DOM assertions; `@testing-library/jest-dom` is not installed and none was added.

## Tests

- TDD: each Red run was recorded failing before Green (Steps 2, 5 and 8).
- Scoped run: `npx vitest run tests/main/parsers.test.js tests/renderer/Pipeline.test.jsx`, green.
- Full suite: `npx vitest run tests/`, 1285 of 1285 tests in 102 of 102 files, green on the second run. On the first run one timing test in `tests/main/agentChannelScript.test.js` (RD5) took 120 ms against its 100 ms limit; it is unrelated and passes alone.
- Not executed here: coverage (80% floor), because coverage tooling is not set up in the repository yet, and the manual visual check in the running app.
