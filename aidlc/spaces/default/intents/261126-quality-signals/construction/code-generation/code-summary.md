# Code Summary — US-1305 Quality signals next to cost

## Files

- New: `src/main/parsers/quality.js` (`qualityOf`), `tests/main/quality.test.js` (12 tests).
- Changed: `src/main/projectService.js` (`addQuality` after `addRework`; `readOrMissing`, `reviewFiles`), `src/renderer/CostTab.jsx` (`QualitySection`), `src/renderer/CostPanel.jsx` (`QualityChart` scatter + table), `src/renderer/FeaturesView.jsx` (`useDelivery`, `ReleaseQuality`), `src/renderer/ProjectView.jsx` (passes `space` to FeaturesView), `src/renderer/theme.css`, `src/shared/locales/{en,sv}.json`, `tests/main/crossMachineCost.test.js` (+4), `tests/renderer/{CostTab,CostPanel,FeaturesView}.test.jsx` (+3, +3, +2).

## Key decisions

- A part whose source is missing is `null` ("no record"); the trouble count adds only the parts that exist.
- Review files are found by walking the intent folder for `reviews/review-*.md`, skipping dot folders and `audit/`.
- With no `test-results.md`, failed runs are "no record" even when the audit has `SENSOR_FAILED` events (`ponytail:` comment in `quality.js`).
- A release shows its quality line only when it has fix stories, a prerelease mark, or the platform release list is missing.
- Scatter dots are labelled by intent slug (the cost timeline has no display name).

## Deviations from the plan

- `ProjectView.jsx` was changed by one line so FeaturesView has the active space for `getVelocity`.

## Tests

- TDD: every Red step failed first (module missing; `quality` absent on `perIntent`; missing test ids), then went green.
- Scoped command from `unit-test-instructions.md`: 7 files, 142 tests passed. ESLint and Prettier clean on the 14 changed files.

## Not run here

- The full suite with coverage (80% floor): left to Build and Test.
