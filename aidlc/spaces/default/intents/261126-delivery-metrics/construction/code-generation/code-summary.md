# Code Summary — US-1304 Delivery metrics

## Files

- New: `src/main/parsers/delivery.js` (pure: `parseFaultIn`, `median`, `failedReleases`, `changeFailureRate`, `timeToRecover`, `releasesPerMonth`, `pullFigures`, `deliveryMetrics`), `tests/main/delivery.test.js` (13 tests).
- Changed: `src/main/parsers/velocity.js` (exports `localDay`, `byVersion`, `RELEASED`), `src/main/platforms/{github,gitlab,bitbucket,index}.js` (`listMergedPulls`, `listReleases`), `src/main/ipc.js` (`project:velocity` adds `delivery`), `src/renderer/VelocityView.jsx` (Delivery section, "Lead time" column), `src/shared/locales/{en,sv}.json`, `docs/features/epic-00-fixes.md` (Fault in line), `tests/main/{platforms,ipc}.test.js`, `tests/renderer/VelocityView.test.jsx`.

## Key decisions

- Lead time is `storyMetrics`' `toReleaseMs`; the "To release" column is renamed "Lead time".
- GitHub merged pull requests come from one GraphQL call with the changes-requested count; GitLab and Bitbucket give `changes: null` (rounds "unknown"). Bitbucket has no merge time, so `updated_on` stands in (`ponytail:`).
- Prereleases are read from GitHub only; on other platforms the source is named missing, and the fix-story part still counts.
- Same-day recovery counts as 0, since tag dates are whole days. A pull request belongs to the first tag whose day ends after its merge.
- Durations use the existing `formatDuration` (hours, no days).

## Tests

- TDD: each Red step failed first (module missing, functions missing, no `delivery`, missing test ids), then went green.
- Scoped command from `unit-test-instructions.md`: 6 files, 188 tests passed (24 new). ESLint and Prettier clean on the changed files.
- One existing assertion in `ipc.test.js` changed from `toEqual({velocity: true})` to `toMatchObject` because the handler now adds `delivery`.

## Not run here

- The full suite with coverage (80% floor): left to Build and Test.
