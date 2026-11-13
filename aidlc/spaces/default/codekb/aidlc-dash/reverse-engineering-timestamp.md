# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-13
- Commit: 10ede6fbc461891368af3418e1b3a74a88c9722c

Fokuserad skanning för intent `261113-feature-docs` (EPIC-06 Feature Docs) över projektvyn, uppsättningsdialogen och -tjänsten, artefaktläsaren, appskalet, inställningarna, IPC-routern, den rotinneslutna filåtkomsten och preload-bryggan. Kunskapsbasen var inaktuell (byggd av `261113-audit-timeline` vid commit `9caa35d30a5b06ff657e4867ffe42be1d51496ce`, själv en partiell kunskapsbas); prosan utanför fokusområdet är bevarad och felaktigheter i fokusfilernas beskrivning är rättade. EPIC-03 (virtualiserad tidslinje med `@tanstack/react-virtual`, stabil `key` per händelse, `newKeys` i useProject) har landat sedan dess och är beskrivet som ytlig kunskap. Den tidigare djuptäckningen kunde inte verifieras om och är nedflyttad till ytlig. Lämnades oöppnat: `node_modules/`, `out/`, `dist/`, `tests/.tmp/`, AI-DLC:s egen installation.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: 261113-feature-docs
fingerprint: 6b2a3c5e2dd623e158791c583cf36c91e49a0a29
analyzed:
  paths:
    - src/renderer/ProjectView.jsx
    - src/renderer/SetupAidlc.jsx
    - src/renderer/ArtifactReader.jsx
    - src/renderer/App.jsx
    - src/main/settings.js
    - src/main/setup.js
    - src/main/ipc.js
    - src/main/projectAccess.js
    - src/preload/index.js
  components:
    - IPC Router
    - Project Access
    - App Settings
    - Setup Service
    - Preload Bridge
    - App Shell
    - Project View
    - Setup View
    - Artifact Reader
shallow:
  paths:
    - src/renderer/Timeline.jsx
    - src/main/parsers/audit.js
    - src/main/watcher.js
    - src/renderer/useProject.js
    - src/main/projectService.js
    - tests/main/parsers.test.js
    - tests/main/projectService.test.js
    - tests/main/watcher.test.js
    - ./
    - tests/main/
    - tests/renderer/
    - tests/fixtures/
    - src/renderer/theme.css
    - src/renderer/IntentDetail.jsx
    - src/main/exec.js
    - src/main/git.js
    - src/renderer/RefreshPanel.jsx
    - src/renderer/ResumeButton.jsx
    - src/renderer/TerminalContext.jsx
    - src/renderer/terminalControl.js
    - build/
    - docs/
    - package.json
    - .gitignore
```
