# Developer Code Scan (US-0608)

Focused scan at `39a3dbf` (2026-11-18) of release planning sync, merged onto the stale store. Code was read only: no tests, builds or app runs.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - src/main/planningRecord.js
  - src/main/planningSync.js
  - src/main/fileWrite.js
  - src/main/releases.js
  - src/main/parsers/releases.js
  - src/renderer/FeaturesView.jsx
  - src/main/ipc.js (the planning, features, file and watcher parts)
  - src/preload/index.js
  - .github/workflows/release.yml
  - package.json
- **Skimmed only**: src/main/features.js (hashes, `featureWatchPaths`), src/renderer/useFeatures.js (reloads), src/main/git.js (worktree, push), src/main/watcher.js (`watchFiles`), src/main/projectAccess.js (`readText`), tests/main/planningSync.test.js, planningRecord.test.js, releases.test.js, releasesPlan.test.js, fileWrite.test.js, features.test.js, tests/renderer/FeaturesView.test.jsx, useFeatures.test.jsx (names and grep)
- **Left out**: node_modules/, out/, dist/, coverage/, tests/.tmp/, .claude/ and the rest of AI-DLC's install and workspace

### Packages Found
- thadeus 0.2.9 — Electron desktop app — JavaScript/JSX — unchanged; see `technology-stack.md`

### Build System
- **Type**: npm, electron-vite, electron-builder
- **Config Files**: package.json, electron.vite.config.mjs, electron-builder.yml, vitest.config.mjs
- **Build Dependencies**: no Playwright or other end-to-end tool is installed

### APIs Discovered
- IPC — `ipc.js` — planning: `features:setRelease`, `features:createRelease`, `features:deleteRelease`, `features:planningStatus`, `features:pushPlanning`; editor: `file:read`, `file:write`; push: `features:changed`

### Frameworks & Libraries
- Unchanged. `gh` and `git` run through `runFixed` (no shell)

### Test Coverage
- **Test Directories**: tests/main, tests/renderer
- **Test Frameworks**: vitest 5.1.0 (node and jsdom)
- **Coverage Config**: present (v8, 80% lines, run in CI)

### Code Quality Indicators
- **Linting**: ESLint and Prettier steps in the `verify` job
- **CI/CD**: `.github/workflows/release.yml`; `verify` = gitleaks, tag check, `npm ci`, `vitest run tests/ --coverage`, ESLint, Prettier. No end-to-end step, no display server
- **Documentation**: every function names its story and requirement

### Technical Debt Signals
- `planningSync.js:211` one operation at a time per project, per process only
- `releases.js:41` epic and overview are two writes, not one transaction
- `FeaturesView.jsx:300` a successful write unlocks only on the next `features` reload
- `planningSync.js:301` the checked-out target only fast-forwards after a rebase
- `planningRecord.js:38` one record write queue for every project

## Handoff Summary
- **Intent-relevant finding**: the record holds only `KINDS = ['setRelease', 'createRelease', 'deleteRelease']` (`planningRecord.js:9`), in `<userData>/planning/<sha1(root)>.json`. Editor saves (`file:write`, `ipc.js:1008`), agent writes and marker edits are not in it. The docs watcher (`syncFeaturesWatch`, `ipc.js:308`) only sends `features:changed`.
- **Intermittent assignment error, most likely cause**: renderer hashes that are out of date, on the in-place path (checkout on the target). `applyAction` uses the renderer's `epicHash`/`overviewHash` for the first story when `inPlace` (`planningSync.js:71`, `:195`). The release list unlocks on any new `features` object (`FeaturesView.jsx:301`). `features:changed` arrives several times per action (`ipc.js:600`, the 300–800 ms docs watcher, and the cycle after a push). `loadDocs` has no sequence guard (`useFeatures.js:31-40`). `ReleasePicker` has no lock (`FeaturesView.jsx:110-136`). So a pick made during or just after another action goes out with old hashes, and `writeFileSafe` refuses it (`fileWrite.js:82-85`). Other causes: a partial write (epic written, overview refused, action dropped); `index.lock` contention with other git users of the checkout; two app instances sharing `dash/planning`.
- **Why waiting changes never show**: `PlanningSync` reads the count only on mount and on a `features` change (`FeaturesView.jsx:220-231`), and it hides at 0. When the app is idle, `planning.kick` pushes right after the action (`ipc.js:601`), so the count is non-zero only for seconds. A tick's result is never sent to the renderer: `features:changed` goes out only on `reapplied || pushed` (`ipc.js:574`). Only the three kinds are counted. The block lives only in the Releases tab, not beside the story-detail picker.
- **Risks / follow-up**: on a story branch the action is committed in a worktree on `dash/planning` and the checkout is never changed. So the release list keeps showing the old markers until `main` comes back into the branch. `planningSync.test.js` already runs real git against a local bare origin; nothing tests concurrent actions, out-of-date hashes or out-of-order reloads. End-to-end tests need a new dev dependency (Playwright), an `electron-vite build` step and xvfb in `verify`.
