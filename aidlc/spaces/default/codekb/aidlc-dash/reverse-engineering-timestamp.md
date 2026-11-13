# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-13
- Commit: 1c3ee0299f3ec945be42d788ba7b16c08d467ab0

Full omskanning av hela repot för intent `261113-workflow-control`; ersätter hela den tidigare kunskapsbasen. Lämnades oöppnat: `node_modules/`, `out/`, `dist/`, innehållet i `package-lock.json`, AI-DLC:s egen installation.

## Scope of Analysis

```yaml
scope_version: 1
kind: full
intent: 261113-workflow-control
fingerprint: ee1f039a5daa35175b2a1e0af342292b04625917
analyzed:
  paths:
    - ./
  components:
    - Main Entry
    - IPC Router
    - Project Access
    - Project Service
    - Configured Models
    - PTY Sessions
    - File Watcher
    - App Settings
    - Parsers
    - Preload Bridge
    - App Shell
    - Project View
    - useProject Hook
    - Intent List
    - Intent Detail
    - Pipeline View
    - Timeline View
    - Bolt DAG View
    - Cost Views
    - Artifact Reader
    - Terminal Panel
    - Branding
    - Format Helpers
    - Build Scripts
shallow:
  paths:
    - src/renderer/theme.css
    - tests/fixtures/
    - build/
```
