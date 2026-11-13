# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-13
- Commit: b30f69abec7775f2ceb0c67fb1765349cd88055f

Full omskanning av hela repot för intent `261113-living-lcars` (EPIC-04 US-0402 och US-0403). Byggutdata (`out/`, `dist/`), beroenden (`node_modules/`), testutdata (`tests/.tmp/`), innehållet i `package-lock.json` och AI-DLC:s egen installation lämnades oöppnade.

## Scope of Analysis

```yaml
scope_version: 1
kind: full
intent: 261113-living-lcars
fingerprint: 21055b3e245b1514539f3988c4a802ca5a01fe16
analyzed:
  paths:
    - ./
  components:
    - Theme Stylesheet
    - App Shell
    - Splash
    - AuctumMark
    - ProjectView
    - IntentList
    - IntentDetail
    - Pipeline
    - Timeline
    - BoltDag
    - ArtifactReader
    - CostPanel
    - CostTab
    - RefreshPanel
    - ResumeButton
    - SetupAidlc
    - FeaturesView
    - ProjectSettingsDialog
    - TerminalPanel
    - TerminalContext
    - Renderer Hooks
    - Renderer Utilities
    - Preload Bridge
    - Main Entry
    - IPC Router
    - Project Service
    - Project Access
    - PTY Manager
    - Exec Runner
    - Settings Store
    - File Watcher
    - Git Reader
    - Setup Helper
    - Model Config Reader
    - Feature Docs Loader
    - Parsers
    - Build Scripts
    - Release Pipeline
    - Test Suite
shallow:
  paths:
    - tests/main/
    - tests/fixtures/
    - docs/features/
    - build/icons/
```
