# Code Summary: US-0303 Project velocity

## Files

- New: `src/main/parsers/velocity.js` (pure: `parseMarkerHistory`, `intentMetrics`, `storyMetrics`, `projectMetrics`, `isoWeek`), `src/renderer/VelocityView.jsx` (`VelocityView`, `IntentVelocity`), `tests/main/velocity.test.js`, `tests/main/velocityLoad.test.js`, `tests/renderer/VelocityView.test.jsx`.
- Changed: `src/main/git.js` (`storyMarkerHistory`), `src/main/exec.js` (optional `maxBuffer`), `src/main/projectService.js` (`loadVelocity`), `src/main/ipc.js` (`project:velocity`), `src/preload/index.js` (`getVelocity`), `src/renderer/IntentDetail.jsx` (Velocity tab), `ProjectView.jsx`, `App.jsx` (`arm-velocity` after Cost), `theme.css` (`.velocity-*`), `src/shared/locales/{en,sv}.json` (Swedish "Takt"); tests added to `git.test.js`, `ipc.test.js`, `preload.test.js`, `AppShell.test.jsx`.

## Key decisions

- Plan-approval wait runs from the `QUESTION_ASKED` with `Question Type: plan-approval` to `PLAN_APPROVAL_RECORDED`/`_REJECTED` (the audit has no `PLAN_APPROVAL_REQUESTED`; it is accepted too if it appears).
- `PHASE_COMPLETED` is matched on `From phase`, falling back to `Phase`. Phase and stage rows are summed per name; an unended start is `open` with no time.
- `sources.missing` kinds: `missing`, `unreadable` (with the error), `epic`, `git`, `features`. An audit with no events is a row marked `empty`, not missing.
- The git history reads the folder of the first epic file; with no epic files there is no git history.
- A span of zero or less is "unknown". Tag dates are local midnight. The average is a step line on the chart.

## Tests

- TDD: each layer's Red run failed before Green (data access 5, business logic 10, API 4, frontend 5 failing).
- Full suite: `npx vitest run tests/`: 132 files, 1572 tests passed (baseline 129 files, 1548 tests; 24 added). Coverage of the new modules from their own tests: `velocity.js` 98.6%, `VelocityView.jsx` 98.3% lines. No coverage setting changed.
- Not executed here: project-wide line coverage against the 80% floor, because coverage is not set up in the repository or CI yet (team rule). Build and Test checks it.

## Deviations from the plan

- `exec.js` changed: `runFixed` takes an optional `maxBuffer`, set to 32 MB for the epic history (`ponytail:` comment); existing calls are unchanged.
- The arm-block test is in `AppShell.test.jsx`, which already sets up the App.
- Empty periods get no bar on the chart (`ponytail:` comment).
- No menu entry for Velocity; only the arm block opens it, as planned.
