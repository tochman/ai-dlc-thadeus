# Code Summary: U1 u1-framework-views (US1.1 / US-1401)

Branch `feat/US-1401`, built test first (Red, Green, Refactor) as the approved plan says. Nothing was pushed or merged.

## Files

| File | Change |
|---|---|
| `src/shared/frameworkViews.js` | New. The one views table per framework (`viewsFor`, `viewFields`, `shownViews`, `sectionsFor`, `PROJECT_SECTIONS`, `AIDLC_SECTIONS`). |
| `src/main/projectService.js` | `detectProject(root, { saved, askWhenBoth })` returns the full C1 Detection. |
| `src/shared/harnesses.js` | opencode markers gain `.opencode`. |
| `src/main/menu.js` | The menu state carries `framework`; Kostnad and Github are enabled only for `aidlc`. |
| `src/main/ipc.js` | `project:open` starts `watchSpace` only for aidlc and `watchForSetup` only for no framework; the setup watcher acts on a framework change. |
| `src/main/watcher.js` | `watchForAidlc` also fires when `.specify/` appears. |
| `src/renderer/App.jsx`, `src/renderer/ProjectView.jsx` | Read `framework`, `views` and `defaultView`. Their `offered` maps and their `isAidlc` reads are gone. |
| `src/renderer/SpeckitShell.jsx` | New. An LCARS frame with `speckit.title` and `speckit.empty`. |
| `src/renderer/ProjectSettingsView.jsx` | Re-exports the section lists from the shared table. |
| `src/shared/locales/sv.json`, `en.json` | `app.specs`, `app.featureCount`, `speckit.title`, `speckit.empty`. |
| `docs/FEATURES.md`, `docs/features/epic-14-spec-kit.md` | US-1401 🚧, then ✅ Done, for v0.3.0. |

Tests: new `tests/main/frameworkViews.test.js` and `tests/renderer/SpeckitShell.test.jsx`. Extended: `projectService`, `harness`, `menu`, `ipc` and `watcher` in `tests/main/`, and `AppShell`, `ProjectView` and `AppAlerts` in `tests/renderer/`. Old Detection fixtures (`{ isAidlc }`) now use the C1 shape.

## Key decisions

- The views table lists the default view first: `intents` for aidlc, `specs` for speckit, `setup` for none. A view the framework does not offer falls back to it (R-01).
- A project with no framework still shows Kostnad, Takt and Github disabled in the arm, as in v0.2.12. A Spec Kit project does not show them. This is the only framework check left in `App.jsx` (`armShows`).
- The Detection's `views` include `features`. The renderer drops it with `shownViews` when the feature docs are hidden.
- `reason` is `null` for a framework that was found and for `source: 'ask'`. U2 and U4 add their own reasons.
- The Spec Kit version note in `SpeckitShell` is left for U6, which reads the version.

## Test results

- Full suite (`npx vitest run tests/ --coverage`): 153 files, 2,024 passed, 1 skipped, 0 failed.
- Line coverage: 92.47% overall, above the 80% floor. New files: `frameworkViews.js` 100%, `SpeckitShell.jsx` 100%. Changed files: `ipc.js` 90.6%, `watcher.js` 93.33%, `menu.js` 80.95%, `harnesses.js` 100%, `ProjectSettingsView.jsx` 93.68%.
- Below 80% on their own: `projectService.js` (77.35%), `App.jsx` (78.66%) and `ProjectView.jsx` (67.1%). These are large existing files, and their coverage on `main` was not measured here. Every line U1 added to them is exercised by the new tests. No threshold was changed.
- ESLint: 0 errors, 29 warnings (the existing `react-hooks/exhaustive-deps` kind). Prettier: clean.
- `electron-vite build`: succeeds.
- Not run in this stage: the Playwright end-to-end tests (`tests/e2e`), which need the built app and run in CI, and the manual `.dmg` check before the release.

## Deviations from the plan

- For a project with no framework, the first arm block's testid is now `project-view-switch-setup` (it was `-intents`), because the first view id comes from the table. The renderer tests were updated; no e2e test uses it.
- The setup watcher test was added to `tests/main/watcher.test.js` as well as `ipc.test.js`, because `watchForAidlc` changed.
