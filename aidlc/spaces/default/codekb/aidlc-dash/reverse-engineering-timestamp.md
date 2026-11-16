# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-16
- Commit: 60bf0d6302b26e02b0e6c9c4b7f2e30bac031506
- Intent: framework-update (`261116-framework-update`, EPIC-05 US-0504)

A focused scan of the framework-update area merged into the store from `4867a36` (intent `manual-releases`), which was STALE for this run. Deeply analyzed: `setup.js`, `tools.js`, `git.js`, `pty.js`, `RefreshPanel.jsx`, `SetupAidlc.jsx` and their three test files; the `aidlc` CLI was asked only `--version` and `--help`. Skimmed: the EPIC-05 story text and the imports `exec.js`, `projectAccess.js`, `harnesses.js`, `TerminalContext.jsx`. Updated sections: business overview (EPIC-05 row, active intent), architecture (data flow 8, a framework-update interaction diagram), API documentation (tool ids, `aidlc` update commands), component inventory (Tools Registry, Setup Helper, Git Reader, RefreshPanel, SetupAidlc), code structure (typed-not-run exception), technology stack (aidlc version), dependencies (US-0504 blast radius), code quality ("Brownfield notes for US-0504"). Everything else is the earlier runs' prose, kept as is; the earlier analyzed paths are demoted to `shallow.paths` below. Code was read only: no tests, builds or app runs. Left unopened: `node_modules/`, `out/`, `dist/`, `coverage/`, `tests/.tmp/`, and AI-DLC's install and workspace.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: framework-update
fingerprint: b914a9396aa8e6ddb76d6d65bb67672ae9a857b8
analyzed:
  paths:
    - src/main/setup.js
    - src/main/tools.js
    - src/main/git.js
    - src/main/pty.js
    - src/renderer/RefreshPanel.jsx
    - src/renderer/SetupAidlc.jsx
    - tests/main/setup.test.js
    - tests/main/tools.test.js
    - tests/renderer/RefreshPanel.test.jsx
  components:
    - Setup Helper
    - Tools Registry
    - Git Reader
    - PTY Manager
    - RefreshPanel
    - SetupAidlc
shallow:
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
    - src/main/exec.js
    - src/renderer/TerminalContext.jsx
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
