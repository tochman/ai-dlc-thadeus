# Developer Code Scan: aidlc-dash, release list (US-0605)

Focused scan for intent `261115-manual-releases` at commit `4867a36`. Code was read only; no tests, builds or app runs.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - src/main/parsers/releases.js
  - src/main/releases.js
  - src/main/features.js
  - src/main/parsers/features.js
  - src/main/ipc.js (the `features:*` and `projectSettings:*` handlers, `syncFeaturesWatch`, `sendFeaturesChanged`; the rest only skimmed)
  - src/preload/index.js
  - src/renderer/FeaturesView.jsx
  - tests/main/releases.test.js
  - tests/renderer/FeaturesView.test.jsx
- **Skimmed only**: `src/main/git.js` (`listReleaseTags`), `src/main/settings.js` (project settings sanitising), `src/main/fileWrite.js` (`writeFileSafe`, `writeAtomic`), `src/renderer/ProjectView.jsx` (where `delivery` is read), `src/shared/locales/en.json` (`features.release*` keys), `docs/features/epic-06-feature-docs.md`, `docs/FEATURES.md`, `docs/releases/`
- **Left out**: `node_modules/`, `out/`, `dist/`, `coverage/`, AI-DLC's install and the `aidlc/` workspace

### Packages Found
- thadeus 0.2.6 — Electron desktop app — JavaScript (ESM, JSX) — one package; unchanged from the store (`code-structure.md`)

### Build System
- **Type**: npm, electron-vite, electron-builder (unchanged; see `technology-stack.md`)
- **Config Files**: not re-read in this run
- **Build Dependencies**: none in the release area

### APIs Discovered
- IPC invoke — `src/main/ipc.js` — release area: `features:load` (features + `tags`), `features:setRelease`, `features:ruleStatus`, `features:storyLinks`, `projectSettings:get|set` (`delivery`)
- IPC push — `features:changed` after a successful `setRelease` and after a project-settings save, and from the feature-docs watcher
- Bridge — `loadFeatures`, `setStoryRelease`, `getLifecycleRuleStatus`, `getStoryLinks`, `getProjectSettings`, `setProjectSettings`, `onFeaturesChanged`

### Frameworks & Libraries
- React 19, react-i18next, vitest + @testing-library/react (versions in `technology-stack.md`); the release code adds no library

### Test Coverage
- **Test Directories**: `tests/main/releases.test.js` (parsers + main write in a temp project), `tests/renderer/FeaturesView.test.jsx` ("FeaturesView: releases (US-0603)", 5 cases, bridge mocked, Swedish UI)
- **Test Frameworks**: vitest (node and jsdom projects)
- **Coverage Config**: present (see the store); not measured here

### Code Quality Indicators
- **Linting**: ESLint and Prettier in CI (unchanged)
- **CI/CD**: `.github/workflows/release.yml` (unchanged)
- **Documentation**: every function names its story and FR; two `ponytail:` ceilings in the area (multi-story segment, two-file write)

### Technical Debt Signals
- `setStoryRelease` writes the epic file and the overview as two writes, not a transaction (`src/main/releases.js:24`).
- A status segment that names several stories is never re-marked (`src/main/parsers/releases.js:53`).
- `VERSION` and `byVersionDesc` are module-private in `parsers/releases.js`; a new-release check would duplicate them unless exported.

## Handoff Summary
- **Intent-relevant finding**: a release exists only as derived data. `buildReleases(epics, tags)` (`src/main/parsers/releases.js:104`) builds one entry per version found in a story's "for/Released in vX.Y.Z" marker or a `vX.Y.Z` git tag (`listReleaseTags`, via `features:load`); `releaseOptions()` (`:83`) offers untagged planned versions plus the next patch and minor after the latest tag (no major, which US-0605 AC1 asks for). Nothing reads or writes a list of planned releases, and `docs/RELEASES.md` does not exist. Adding a story from the release list can reuse `bridge.setStoryRelease` → `setStoryRelease` → `setReleaseMarker` (US-0603 FR2.2) as it is.
- **Risks / follow-up**:
  - Hash check: `setStoryRelease` refuses a write when `epicHash`/`overviewHash` differ from disk, and every write changes `FEATURES.md`. Adding several stories in a row with the hashes from one load conflicts from the second story on; each call must wait for the reload (`features:changed`) or main needs a batch call.
  - A new file store needs a create path: `writeFileSafe` stats the target and fails on a missing file (`fileWrite.js:79`); `writeAtomic` exists. `featureWatchPaths` watches only the overview and the epic folders, so `docs/RELEASES.md` would not reload the view unless added there.
  - `docs/releases/` already holds hand-written release plans (`0.2.3.md`, `0.2.4.md`, no `v` prefix). A `docs/RELEASES.md` sits next to it with a near name; the design should say how the two relate.
  - The app-settings alternative would need a new whitelisted key in `settings.js` (`setProjectSettings` drops unknown keys) and is invisible to other clones and tools.
  - `ReleasesView` gets `features` and `onOpenStory` but no `projectId`; the new actions need it. Delivery gating is `delivery === 'releases'` in `FeaturesView` (from `settings.delivery ?? DELIVERY_DEFAULT` in `ProjectView.jsx:272`); the Releases tab is chosen in the left arm.
  - Delete rule data is at hand: an entry with `stories.length === 0` and no tag (`date`/`released` from tags) is deletable.
