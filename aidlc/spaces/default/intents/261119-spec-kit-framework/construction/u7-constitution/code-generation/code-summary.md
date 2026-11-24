# Code Summary: U7 u7-constitution (US-1404)

Branch `feat/US-1404` from `main`, not committed yet. All 15 plan steps are done.

## Files

- New: `src/main/speckitRules.js` (`hooksFrom`, `loadSpeckitRules`, `readSpeckitFile`), `src/renderer/SpeckitRules.jsx`, `tests/main/speckitRules.test.js`, `tests/renderer/SpeckitRules.test.jsx`.
- Changed: `src/main/speckitFeatures.js` (`readLimited` exported with its behaviour unchanged; three watch paths), `src/main/watcher.js`, `src/main/ipc.js` (`speckit:rules`), `src/preload/index.js`, `src/shared/frameworkViews.js` (the `speckit` section), `src/renderer/ProjectView.jsx`, `src/renderer/theme.css`, `src/shared/locales/{en,sv}.json`, `package.json` and `package-lock.json`. Their tests changed too.
- Docs and record: `docs/FEATURES.md`, `docs/features/epic-14-spec-kit.md` (US-1404 ✅ Done, "for v0.3.0"), and C6 in `contract-summary.md`.

## Dependency

`yaml` 2.9.1 (`^2.9.1` in `package.json`), ISC licence, no dependencies of its own. It is used only in the main process.

## Key decisions

- One read path, `readSpeckitFile`: `resolveInRoot` containment, a regular-file check (so a folder or FIFO is never opened), then the 1 MB and UTF-8 checks in `readLimited`. A `ponytail:` comment marks the gap between the stat and the read.
- Command names and ids must match `^[a-z0-9][a-z0-9._-]{0,99}$`. An unsafe name is left out, counted and named in `errors`.
- `speckit:rules` refuses a project that is not Spec Kit (`errors.notSpeckitProject`).
- The view opens the fixed constitution path through the editor context and types `/speckit-constitution ` through the terminal context, only on a click. When the constitution exists but cannot be read, the view shows the error and does not offer the command.

## Deviations from the plan

1. `src/main/watcher.js`: `isWatchedFile` treated `.yml` paths as folders, so it never saw a change to `extensions.yml`. `yml` and `yaml` were added to its file pattern.
2. `watcher.test.js` belongs to the vitest `scripts` project, not `main`. It is run with `--project scripts`. The command in `unit-test-instructions.md` lists it under `main`, where it finds no tests.
3. The new watcher test has a 10 s test timeout, because it runs three changes of up to 2 s each. Each change still has to arrive within 2 s.
4. C6 also gains `condition` and `hooksChecked` (false after `extensions.yml` fails to parse), beyond the planned `target` and `skipped`.
5. A few LCARS style lines were added in `theme.css`.
6. 34 new tests against an estimate of about 40.

## Test runs (unit-scoped)

- Baseline before any edit: main 110 passed, watcher 17, ProjectView 17.
- After the build: main (4 files) 132 passed, including 19 in `speckitRules.test.js`. Scripts (`watcher.test.js`) 18 passed. Renderer (`SpeckitRules`, `ProjectView`) 28 passed. `i18nKeys`, `featureDocsStatus`, `AppShell`, `SpeckitFeatures` and `ProjectSettingsView` are also green.
- Every Red run failed for the expected reason before its Green.
- ESLint and Prettier are clean on the changed files.

## Not run here

- The full suite with coverage: Build and Test checks the 80% floor on the full suite.
- The Playwright end-to-end tests: also left to Build and Test and CI.
