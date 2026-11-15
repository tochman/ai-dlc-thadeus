# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-15
- Commit: 4867a368fac7b31bf46937a83fffd0a60f3dd8cb
- Intent: manual-releases (`261115-manual-releases`, EPIC-06 US-0605)

A focused scan of the release area merged into the store from `bc1dd3d` (intent `repo-public-ready`), which was STALE for this run. Deeply analyzed: the release and feature-docs parsers, the features loader and releases service, the preload bridge, `FeaturesView.jsx`, their two test files, and in `ipc.js` the `features:*` and `projectSettings:*` handlers and the feature-docs watch (the rest of `ipc.js` skimmed). Skimmed: `git.js` `listReleaseTags`, `settings.js`, `fileWrite.js`, `ProjectView.jsx`, the locales, the EPIC-06 docs and `docs/releases/`. Updated sections: business overview (EPIC-06 row, releases, active intent), architecture (data flow 7, "Releases: derived, not stored", two decisions, a release interaction diagram), API documentation (feature-docs and project-settings channels, files read), component inventory (IPC Router, Features Loader, Releases Service, Features Parser, Releases Parser, Preload Bridge, FeaturesView), code structure (classification, dependency graph), dependencies (cross-process row, release-area graph), code quality ("Brownfield notes for US-0605"), technology stack (version note). Everything else is the earlier runs' prose, kept as is; the earlier analyzed paths are demoted to `shallow.paths` below. Code was read only: no tests, builds or app runs. Left unopened: `node_modules/`, `out/`, `dist/`, `coverage/`, and AI-DLC's install and workspace.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: manual-releases
fingerprint: c88ba904494a1ba6226dd3394795a797acd1ae04
analyzed:
  paths:
    - src/main/parsers/releases.js
    - src/main/releases.js
    - src/main/features.js
    - src/main/ipc.js
    - src/preload/index.js
    - src/renderer/FeaturesView.jsx
    - src/main/parsers/features.js
    - tests/main/releases.test.js
    - tests/renderer/FeaturesView.test.jsx
  components:
    - Releases Parser
    - Releases Service
    - Features Loader
    - Features Parser
    - IPC Router
    - Preload Bridge
    - FeaturesView
shallow:
  paths:
    - package.json
    - package-lock.json
    - electron-builder.yml
    - .github/
    - .gitignore
    - LICENSE
    - README.md
    - build/
    - scripts/
    - tests/fixtures/
    - docs/
    - .nvmrc
    - electron.vite.config.mjs
    - vitest.config.mjs
    - eslint.config.mjs
    - .prettierrc.json
    - .prettierignore
    - src/main/
    - src/preload/
    - src/shared/
    - src/renderer/
    - tests/main/
    - tests/renderer/
```
