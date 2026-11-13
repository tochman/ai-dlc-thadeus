# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-13
- Commit: 22831024f1bd53ebe8854335fc065d27a77bad42

Full skanning av hela repot (första skanningen, ingen tidigare kunskapsbas) för intent `261113-cost-and-models`, djup Minimal. Utelämnat oöppnat: `node_modules/`, `out/`, `dist/`, innehållet i `package-lock.json` samt AI-DLC:s egen installation och arbetsyta.

## Scope of Analysis

```yaml
scope_version: 1
kind: full
intent: 261113-cost-and-models
fingerprint: 222f2a611dbb5a375e8b91e8f4ec2edb68852db5
analyzed:
  paths:
    - ./
  components:
    - main-entry
    - ipc
    - projectAccess
    - projectService
    - watcher
    - pty
    - settings
    - parsers
    - preload-bridge
    - App
    - ProjectView
    - useProject
    - IntentList
    - IntentDetail
    - Pipeline
    - Timeline
    - BoltDag
    - ArtifactReader
    - TerminalPanel
    - Splash
    - AuctumMark
    - format
    - theme
    - release-workflow
    - test-suite
shallow:
  paths:
    - src/renderer/theme.css
    - tests/fixtures/
    - docs/features/epic-01-bridge-console-mvp.md
    - docs/features/epic-03-audit-timeline.md
    - docs/features/epic-04-branding-and-desktop.md
```
