# Code Summary: U2 u2-main-planning-read (US-0036)

Branch `fix/US-0036` from `main`, nothing committed. All 15 plan steps done, test first.

## Files
- `src/main/parsers/features.js`: pure `overlayOwn(target, work, own)` (reuses `applyChange`).
- `src/main/planningSync.js`: `planningSource(ctx)`, `listAt` (`git ls-tree`), the stale-copy drop (`olderCopy`, last 20 commits, `ponytail:`), `moved` on a fetch that moves the read ref; `showAt` and `ownStories` exported.
- `src/main/features.js`: `loadFeatures(root, path, {read, list})`; `loadPlanningFeatures(ctx)` with `source`.
- `src/main/ipc.js`: `features:load` uses it; the scheduler sends `features:changed` on `moved`.
- `src/renderer/FeaturesView.jsx`: `features-source` line; locales `features.source.remote|local|here`.
- Tests: `planningSplit` +4, `planningSync` +7, `features` +3, `FeaturesView` +2; `ipc.test.js` one mock line.
- Docs: US-0036 set to 🚧 on this branch.

## Results
- Red runs failed as planned; the "text on no commit stays a conflict" guard passed before the fix.
- Unit command: 8 files, 185 tests pass. Prettier clean. ESLint 0 errors; 1 warning already on `main` (`FeaturesView.jsx:716`).
- Not run here: the full suite with coverage (Build and Test).

## Deviations
1. `tests/main/ipc.test.js` (on the spec-kit work's list) got one mock line for `loadPlanningFeatures`; it may need a merge with that branch.
2. With planning off (docs hidden or continuous delivery), `features:load` still reads the checkout: the sync does not split branch edits there.
3. `overlayOwn` lays only story blocks on top; status lines and the overview row keep `main`'s text, so EPIC-00's Status line does not hide `main`'s releases.
4. `listAt` added; `loadFeatures` takes `{read, list}`.
5. The source-line tests pass `source` in the `features` prop, as the existing tests do.
6. `features.js` and `planningSync.js` import each other; neither uses the other at load time.

## Gap
`moved` comes only from the cycle's own fetch, which runs only when something waits to be pushed. The Fetch and team refresh buttons (`git:fetch`, `team:refresh`) also move `origin/main` but send no `features:changed`, so after a manual fetch a release from `main` shows at the next reload. One `sendFeaturesChanged` call in each handler would close it.
