# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-14
- Commit: 2d111d6175fef7c4fe65dc7cc4cd197dbdebcc25

A full rescan for intent `261114-agent-dialogs` (EPIC-05 US-0506: questions, permission prompts and messages from Claude Code and other agents in the app's dialog). It wholesale replaces the nine artifacts of the earlier store, and the scope block below records this run only. Every hand-written source file under `src/main/`, `src/preload/`, `src/shared/` (except the locale data) and `src/renderer/` (except `theme.css`) was read, with the build and CI configuration, `scripts/`, the intent-area tests and fixtures, `docs/FEATURES.md` and the EPIC-05 epic file. The other tests, `theme.css`, the locale files, the other docs, `README.md` and `build/` were only skimmed, so the block is `kind: partial`. Code was read only: no tests, builds or app runs. Build output (`out/`, `dist/`), dependencies (`node_modules/`), test output (`tests/.tmp/`) and AI-DLC's own install and workspace (`.claude/`, `.aidlc/`, `.opencode/`, `aidlc/`, `aidlc.settings.json`, `opencode.json`, the AI-DLC section of `AGENTS.md` and of `.gitignore`) were left unopened.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: agent-dialogs
fingerprint: ef228898f521ae9c014c3a1bea2f0d4bd13a43e0
analyzed:
  paths:
    - package.json
    - package-lock.json
    - electron.vite.config.mjs
    - vitest.config.mjs
    - electron-builder.yml
    - .nvmrc
    - .gitignore
    - .github/workflows/release.yml
    - scripts/
    - src/main/
    - src/preload/
    - src/shared/appName.js
    - src/shared/configTables.js
    - src/shared/harnesses.js
    - src/shared/i18n.js
    - src/shared/planName.js
    - src/renderer/editor/
    - src/renderer/index.html
    - src/renderer/main.jsx
    - src/renderer/App.jsx
    - src/renderer/AboutDialog.jsx
    - src/renderer/ArtifactReader.jsx
    - src/renderer/AuctumMark.jsx
    - src/renderer/BoltDag.jsx
    - src/renderer/ConfigEdit.jsx
    - src/renderer/ConfigView.jsx
    - src/renderer/CostPanel.jsx
    - src/renderer/CostTab.jsx
    - src/renderer/DocsDialog.jsx
    - src/renderer/FeaturesView.jsx
    - src/renderer/IntentDetail.jsx
    - src/renderer/IntentList.jsx
    - src/renderer/Lcars.jsx
    - src/renderer/Pipeline.jsx
    - src/renderer/PlansView.jsx
    - src/renderer/ProjectSettingsDialog.jsx
    - src/renderer/ProjectView.jsx
    - src/renderer/QuestionPopup.jsx
    - src/renderer/RefreshPanel.jsx
    - src/renderer/ResumeButton.jsx
    - src/renderer/SettingsView.jsx
    - src/renderer/SetupAidlc.jsx
    - src/renderer/Splash.jsx
    - src/renderer/TerminalContext.jsx
    - src/renderer/TerminalPanel.jsx
    - src/renderer/Timeline.jsx
    - src/renderer/TokenView.jsx
    - src/renderer/UpdateNotice.jsx
    - src/renderer/featureDocsPrompt.js
    - src/renderer/format.js
    - src/renderer/picker.js
    - src/renderer/terminalControl.js
    - src/renderer/tokenFlow.js
    - src/renderer/tokens.js
    - src/renderer/useFeatures.js
    - src/renderer/useProject.js
    - tests/main/questions.test.js
    - tests/main/notify.test.js
    - tests/main/pty.test.js
    - tests/main/harness.test.js
    - tests/renderer/QuestionPopup.test.jsx
    - tests/renderer/picker.test.jsx
    - tests/renderer/pickerSmoke.test.jsx
    - tests/renderer/terminalControl.test.jsx
    - tests/fixtures/picker/index.js
    - tests/fixtures/picker/single.txt
    - tests/fixtures/picker/batch-square.txt
    - tests/fixtures/picker/gate.txt
    - docs/FEATURES.md
    - docs/features/epic-05-workflow-control.md
  components:
    - Main Entry
    - IPC Router
    - Project Service
    - Project Access
    - Questions Parser
    - Notifications
    - PTY Manager
    - Exec Runner
    - Tools Registry
    - Harness Detection
    - Settings Store
    - Watcher
    - Setup Helper
    - AI-DLC Config Reader
    - AI-DLC Config Writer
    - Plans Service
    - Model Choice
    - Model Config Reader
    - Git Reader
    - Updater
    - File Editor Service
    - Features Loader
    - App Menu
    - Main i18n
    - Audit Parser
    - State Parser
    - Runtime Graph Parser
    - Pipeline Merger
    - Intents Merger
    - Units Status
    - Ledger Parser
    - Features Parser
    - Preload Bridge
    - Harness Table
    - Shared i18n
    - Config Tables
    - App Name Module
    - Plan Name Rule
    - Renderer Bootstrap
    - App Shell
    - ProjectView
    - TerminalContext
    - TerminalPanel
    - Terminal Control
    - Picker Reader
    - QuestionPopup
    - ResumeButton
    - IntentList
    - IntentDetail
    - Pipeline
    - Timeline
    - BoltDag
    - ArtifactReader
    - CostPanel
    - CostTab
    - TokenView
    - Token Flow
    - RefreshPanel
    - SetupAidlc
    - ProjectSettingsDialog
    - SettingsView
    - ConfigView
    - ConfigEdit
    - PlansView
    - FeaturesView
    - Editor
    - UpdateNotice
    - AboutDialog
    - DocsDialog
    - Splash
    - LCARS Primitives
    - Format Helpers
    - Theme Tokens
    - useProject
    - useFeatures
    - Feature Docs Prompt
    - Release Workflow
    - Build Scripts
shallow:
  paths:
    - src/renderer/theme.css
    - src/shared/locales/
    - tests/main/
    - tests/renderer/
    - tests/fixtures/
    - docs/features/
    - docs/releases/
    - docs/screenshots/
    - README.md
    - LICENSE
    - build/
```
