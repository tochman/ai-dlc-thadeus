# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-13
- Commit: fec505b24db5db906c25efb2c170119078bbff16

Fokuserad skanning för intent `261113-fullscreen-menu` (EPIC-04 US-0404: helskärm och egen appmeny) ovanpå en STALE store från intent `261113-living-lcars` (byggd vid commit `b30f69abec7775f2ceb0c67fb1765349cd88055f`, före designlyftet). Djupt lästes bara fönster, IPC, inställningar, preload, app-skalet, app-inställningsdialogen och paketeringskonfigurationen. Tidigare prosa utanför det området är bevarad, med korta noteringar om designlyftet där det syntes; den tidigare fullständiga täckningen (`./`) är nedflyttad till skummad eftersom den inte kunde omverifieras. Byggutdata (`out/`, `dist/`), beroenden (`node_modules/`), testutdata (`tests/.tmp/`) och AI-DLC:s egen installation lämnades oöppnade.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: 261113-fullscreen-menu
fingerprint: 4d14947228ff88b329a881518eec34dec17241bc
analyzed:
  paths:
    - src/main/index.js
    - src/main/ipc.js
    - src/main/settings.js
    - src/preload/index.js
    - src/renderer/App.jsx
    - src/renderer/AppSettingsDialog.jsx
    - electron-builder.yml
    - package.json
  components:
    - App Shell
    - AppSettingsDialog
    - Preload Bridge
    - Main Entry
    - IPC Router
    - Settings Store
    - Packaging Config
shallow:
  paths:
    - ./
    - src/renderer/
    - tests/main/
    - tests/renderer/
    - tests/fixtures/
    - docs/features/
    - build/icons/
```
