# Unit Test Instructions — US-0603

## Setup

vitest 5.1.0 is already configured in `vitest.config.mjs` with two projects: `main` (node) and `renderer` (jsdom, Swedish locale, `tests/renderer/setup-i18n.js`). No new configuration or dependency.

## Runner check (before the first Red)

```bash
npx vitest run tests/main/features.test.js
```

Verified 2026-11-15 before any change: 1 file, 5 tests passed (vitest 5.1.0).

## This story's tests

```bash
npx vitest run tests/main/releases.test.js tests/main/features.test.js tests/main/settings.test.js tests/main/git.test.js tests/main/ipc.test.js tests/main/preload.test.js tests/main/featureDocsStatus.test.js tests/main/i18nKeys.test.js tests/renderer/FeaturesView.test.jsx tests/renderer/ProjectSettingsDialog.test.jsx tests/renderer/featureDocsPrompt.test.jsx tests/renderer/ProjectView.test.jsx tests/renderer/useFeatures.test.jsx
```

About 25 new tests, one or more per requirement (Minimal strategy), plus a happy path per new module.

## Coverage

The 80% line floor (NFR3, team practice) is project-wide and is measured by Build and Test on the full suite. Coverage tooling is not set up in this repository yet, so it is reported as not measured; this story does not change any threshold.

## Mocking and test data

- Git: `listReleaseTags` takes the same injectable `exec` as the other `git.js` functions; tests pass a fake that returns tag lines or throws.
- Files: `setStoryRelease` tests write a small `docs/FEATURES.md` and epic file into a temp folder (`fs.mkdtemp` under `os.tmpdir()`), as `fileWrite.test.js` does, and compare bytes before and after.
- Renderer: `window.bridge` is stubbed per test (as the existing `FeaturesView` and `ProjectView` tests do); the terminal's `type` is a spy.
- Markdown fixtures are inline strings shaped like `docs/features/epic-06-feature-docs.md` (story head, `**Status (…)**` line, `FEATURES.md` row with `·` segments).
