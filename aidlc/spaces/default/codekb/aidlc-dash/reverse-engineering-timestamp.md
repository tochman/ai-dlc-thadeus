# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-16
- Commit: 721e051112b0906bad7eec75e798198455977425
- Intent: agent-progress (`261116-agent-progress`, EPIC-05 US-0507)

This was a full rescan of the repository root, and it replaces every earlier artifact. The developer agent did both the scan and the synthesis, because the architect was switched off for this run.

What was read, and how closely:
- Read line by line: the intent and graph readers (`projectService.js`, the parsers), `watcher.js`, `projectAccess.js`, the project watch and detail parts of `ipc.js`, `BoltDag.jsx`, `IntentDetail.jsx`, `useProject.js` and the DAG styles.
- Read at the level of header, imports and exports: every other tracked hand-written file, with the root configs read whole.
- Read for orientation only: one earlier intent's audit, runtime graph, plan and review records.
- Not opened: `node_modules/`, `out/`, `dist/`, `coverage/`, `tests/.tmp/`, `.thadeus/tokens/`, the `.claude/worktrees/` checkouts, and AI-DLC's install and workspace (`.claude/`, `.aidlc/`, `.opencode/`, `aidlc/`).

Code was read only: no tests, builds or app runs.

## Scope of Analysis

```yaml
scope_version: 1
kind: full
intent: agent-progress
fingerprint: 1bb514eb97e2b7cc12a91b7958bcadfdcd7211d0
analyzed:
  paths:
    - ./
  components:
    - Main Entry
    - IPC Router
    - Project Service
    - Project Access
    - Watcher
    - Audit Parser
    - State Parser
    - Runtime Graph Parser
    - Pipeline Merger
    - Intents Merger
    - Units Status
    - Ledger Parser
    - Features Parser
    - Releases Parser
    - Questions Parser
    - Notifications
    - PTY Manager
    - Exec Runner
    - Tools Registry
    - Harness Detection
    - Settings Store
    - Setup Helper
    - AI-DLC Config Reader
    - AI-DLC Config Writer
    - AI-DLC Update Check
    - Plans Service
    - Model Choice
    - Model Config Reader
    - Git Reader
    - Updater
    - File Editor Service
    - Features Loader
    - Releases Service
    - Token Readings
    - App Menu
    - Main i18n
    - Agent Channel
    - Agent Event Store
    - Agent Adapters
    - Agent Permissions
    - Agent Replies
    - Agent IPC
    - Agent Hooks Installer
    - Agent Timing Log
    - Preload Bridge
    - Harness Table
    - Shared i18n
    - Config Tables
    - App Name Module
    - Plan Name Rule
    - Agent Text Sanitizer
    - Agent Order
    - Alert Plan
    - Locale Files
    - Renderer Bootstrap
    - App Shell
    - ProjectView
    - TerminalContext
    - TerminalPanel
    - Terminal Control
    - Picker Reader
    - AgentDialog
    - ReplyPage
    - LatestMessageStrip
    - AgentHooks UI
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
    - TokenDetail
    - Token Charts
    - RefreshPanel
    - Workflow Busy Rule
    - AidlcUpdate
    - SetupAidlc
    - ProjectSettingsView
    - SettingsView
    - ConfigView
    - ConfigEdit
    - PlansView
    - FeaturesView
    - Story Filter
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
    - Theme Stylesheet
    - Release Workflow
    - Build Scripts
    - Packaging Config
    - Dialog Hook Script
    - Test Suite
    - Test Fixtures
    - Project Docs
shallow:
  paths:
    - docs/
    - build/
```
