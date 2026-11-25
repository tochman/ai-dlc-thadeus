# Code Summary: change the plan of an intent that has started (US-0509)

All 13 plan steps are built, test first. Nothing is committed yet.

## Files

- **New:** `src/shared/planChange.js` (the comparison, the counting rule, the description check, `quoted`), `src/renderer/PlanChange.jsx` (the control and its dialog), `tests/main/planChange.test.js`, `tests/renderer/PlanChange.test.jsx`
- **Changed:** `src/main/parsers/state.js`, `src/main/parsers/pipeline.js`, `src/main/projectService.js`, `src/renderer/IntentDetail.jsx`, `Pipeline.jsx`, `ResumeButton.jsx`, `PlansView.jsx`, `ArchiveControls.jsx`, `theme.css`, `src/shared/locales/sv.json`, `en.json`
- **Tests extended:** `parsers`, `projectService`, `Pipeline`, `IntentDetail`, `PlansView`, `tests/e2e/intentLayout.spec.js`

## Key decisions

- `stageRuns` is the one rule for which stages count, used by `mergePipeline` and `isSkipped`, so the counts, the dots and the pipeline agree.
- The line is typed in an effect after the dialog has closed, so focus ends in the agent tab.
- The dialog stays mounted once opened, so focus has somewhere to go when the control disappears (the intent list).
- A detail shown from its last valid data, or an intent with a read error, counts as unreadable.

## Tests

- 75 new: 17 comparison, 45 control and dialog, 12 in existing unit files, 1 Playwright. The Reds failed first, except two kinds that guard behaviour already there: "Step n of m" follows a new detail, and the "hidden" cases against an empty component.
- The unit's two commands together: 13 files, 221 passed. Playwright `intentLayout.spec.js` on the built app: 11 passed, at 1280 and 1920. Both were run again by the conductor after the build.
- Line coverage of the two new files: 120 of 121 lines.
- ESLint and Prettier clean on the changed files (`theme.css` and the locale files: Prettier).

**Not run in this stage:** the full suite with coverage, the other Playwright specs and the timed `scripts` tests. Build and Test runs them. A real line was never sent to an agent: the tests use doubles, and the built app ran without one.

## Deviations from the plan

1. **Unit by unit is narrower.** The plan said Construction stages are never behind with `unit-major`. Built: only while the current stage is in Construction and Units Generation is done, since AI-DLC goes unit by unit only once there are units. Without this, work that is `unit-major` without units would show passed stages as "added".
2. **`ArchiveControls.jsx`** was not in the plan. Its focus fallback is now an exported function, `intentListNear`, used by both. It behaves as before.
3. **The e2e fixture** also has a `.claude` folder, as plans are read only for an installed harness. It applies to every test in that spec.

## Known limits

- A stage AI-DLC itself goes back to (Reverse Engineering it owes, or one added just after it was passed) shows as "Not run" until it starts (`ponytail:` in `pipeline.js`).
- With units, a not-run Construction stage still counts as ahead at Build and Test.
- The list of plans is read once per opening of the dialog.
