# Code Summary: US-0608, every planning change is kept until it is on the target

## Files

- Modified (main): `src/main/planningRecord.js` (content entries, conflict state, `markConflict`/`resolveEntry`), `src/main/parsers/features.js` (`storyBlocks`, `splitChange`), `src/main/planningSync.js` (own-write hashes, `recordContent`, story-branch split, replay and conflicts, 30 s commit debounce), `src/main/ipc.js` (editor saves and watcher writes recorded, every cycle result sent as `features:planningChanged`, `features:resolvePlanning`), `src/main/index.js` (test-only `THADEUS_E2E_USER_DATA`), `src/preload/index.js`.
- Modified (renderer): `src/renderer/FeaturesView.jsx` (shared hash-keyed lock, `PlanningSync` as a list in Releases and beside the story-detail picker, conflict choices), `src/renderer/useFeatures.js` (sequence guard), `src/shared/locales/sv.json`, `en.json`.
- Build: `package.json`/`package-lock.json` (`@playwright/test` devDependency), `.github/workflows/release.yml` (`verify`: user-namespace `sysctl`, `electron-vite build`, `xvfb-run -a npx playwright test`; `build-mac`: `npx playwright test`).
- New: `playwright.config.mjs`, `tests/e2e/planning.spec.js`, `tests/main/planningSplit.test.js`.
- Tests modified: `planningRecord`, `planningSync`, `ipc`, `fileWrite` (allow-list adds `planningSync.js`), `FeaturesView`, `useFeatures`.

## Key decisions

As planned (D1–D7). The lock stays on only after an `ok`, `inPlace`, `changed` write, until a load with other hashes; any other answer unlocks at once. Only the release list asks main to re-apply waiting changes; the picker's list only shows them.

## Tests

- Targeted vitest (plan command plus `ipc.test.js`, `i18nKeys.test.js`): 9 files, 190 tests, all pass.
- Playwright against the built app on macOS: 2 passed (FR9.1, FR9.2), also with `--repeat-each=2`.
- ESLint: 0 errors, 29 warnings. Prettier: this work's files formatted; the full check was not re-run afterwards.

## Not executed here

- The CI steps (`sysctl`, `xvfb-run` and Electron on `ubuntu-latest`, `build-mac` Playwright step): no pull request run yet.
- Coverage (80% floor) and the full suite: left to Build and Test.

## Deviations

1. Step 18 has no Red run: the built app could only start on the person's real userData before the env var existed, so the var was added first and the spec passed on its first run (Steps 1–17 had already built what it checks).
2. FR9.2 on a story branch removes a story through the picker (release, then None), because the story branch view shows the story's own tree and has no Remove button; planned changes there show only in the waiting list (US-0606 behaviour).
