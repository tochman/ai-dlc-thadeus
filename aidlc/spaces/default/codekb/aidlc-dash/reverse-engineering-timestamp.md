# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-13
- Commit: 4b5b8c615a2e0cb7d565c01d052db8504668b652

A focused scan for intent `261113-harness-choice` (EPIC-08 US-0801: choose the harness the agent terminal runs per project), on top of a STALE store from intent `261113-thadeus-name` (built at commit `8623af40b2eaf4b3676bb5dfad0e66865a2695b5`, before US-0406 and US-0701 were committed). The scan stayed inside the snapshot paths `src/main`, `src/renderer`, `src/preload`, `src/shared` and `tests`. It read in depth the agent terminal and pty, the exec runner, AI-DLC setup, project detection and per-project settings, the IPC router and preload bridge, the app shell and project view, cost and ledger reading, the model reader, the i18n module and the English locale, and the matching tests. Prose outside that area is kept from the earlier scans and marked as such. Its Swedish text is now in English, the conversation language of this workflow. Where US-0406 and US-0701 made it outdated in the files read (shared `appName.js`, `t()` texts, the `language` setting, `i18n:language`, new test files), it is corrected. Earlier analyzed paths that were not re-read are moved to the shallow list. Code was read only: no tests, builds or app runs. Build output (`out/`, `dist/`), dependencies (`node_modules/`), test output (`tests/.tmp/`) and AI-DLC's own install and workspace were left unopened.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: 261113-harness-choice
fingerprint: 2683ea20dc21e018f2575bbd3592186591ef975c
analyzed:
  paths:
    - src/main/pty.js
    - src/main/exec.js
    - src/main/setup.js
    - src/main/models.js
    - src/main/projectService.js
    - src/main/projectAccess.js
    - src/main/settings.js
    - src/main/ipc.js
    - src/main/i18n.js
    - src/main/notify.js
    - src/main/parsers/ledger.js
    - src/preload/index.js
    - src/shared/i18n.js
    - src/shared/appName.js
    - src/shared/locales/en.json
    - src/renderer/TerminalPanel.jsx
    - src/renderer/TerminalContext.jsx
    - src/renderer/terminalControl.js
    - src/renderer/ResumeButton.jsx
    - src/renderer/SetupAidlc.jsx
    - src/renderer/ProjectSettingsDialog.jsx
    - src/renderer/ProjectView.jsx
    - src/renderer/App.jsx
    - src/renderer/CostPanel.jsx
    - src/renderer/CostTab.jsx
    - src/renderer/featureDocsPrompt.js
    - src/renderer/main.jsx
    - tests/main/pty.test.js
    - tests/main/setup.test.js
    - tests/main/settings.test.js
    - tests/main/i18n.test.js
    - tests/main/i18nKeys.test.js
    - tests/renderer/TerminalPanel.test.jsx
    - tests/renderer/ResumeButton.test.jsx
    - tests/renderer/SetupAidlc.test.jsx
    - tests/renderer/CostPanel.test.jsx
    - tests/renderer/setup-i18n.js
  components:
    - App Shell
    - ProjectView
    - CostPanel
    - CostTab
    - ResumeButton
    - SetupAidlc
    - ProjectSettingsDialog
    - TerminalPanel
    - TerminalContext
    - Terminal Control
    - Feature Docs Prompt
    - Renderer Bootstrap
    - Shared i18n
    - Locale Files
    - App Name Module
    - Preload Bridge
    - IPC Router
    - Project Service
    - Project Access
    - PTY Manager
    - Exec Runner
    - Settings Store
    - Setup Helper
    - Model Config Reader
    - Ledger Parser
    - Main i18n
    - Test Suite
shallow:
  paths:
    - src/main/
    - src/main/index.js
    - src/main/menu.js
    - src/main/questions.js
    - src/main/watcher.js
    - src/main/parsers/audit.js
    - src/main/parsers/intents.js
    - src/renderer/
    - src/renderer/index.html
    - src/renderer/Splash.jsx
    - src/renderer/theme.css
    - src/renderer/AuctumMark.jsx
    - src/renderer/RefreshPanel.jsx
    - src/renderer/QuestionPopup.jsx
    - src/renderer/AppSettingsDialog.jsx
    - src/renderer/DocsDialog.jsx
    - src/renderer/useProject.js
    - src/renderer/format.js
    - src/shared/locales/sv.json
    - tests/main/
    - tests/main/menu.test.js
    - tests/renderer/
    - tests/renderer/AppShell.test.jsx
    - tests/renderer/Splash.test.jsx
    - tests/fixtures/
    - package.json
    - package-lock.json
    - vitest.config.mjs
    - electron-builder.yml
    - README.md
    - .github/workflows/release.yml
    - docs/FEATURES.md
    - docs/features/
    - build/icons/
```
