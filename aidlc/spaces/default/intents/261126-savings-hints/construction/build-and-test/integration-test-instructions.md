# Integration Test Instructions — US-1302 Savings hints

## Boundaries covered

- **Main ↔ files**: `loadSavings` reads the ledger summary, the audit events and the transcript files of a project; `setDismissed` writes `.thadeus/savings-dismissed.json` inside the root (refuses a `.thadeus` that leads out of it). Covered by `tests/main/savings.test.js` with a temporary project folder.
- **Ledger parser → savings**: stage rows carry raw tokens per model and agent names (`tests/main/ledger.test.js`).
- **Writers allowlist**: `tests/main/fileWrite.test.js` checks that `savings.js` is a known, justified `writeAtomic` user.
- **Renderer ↔ bridge**: `CostTab` and `CostPanel` call `window.bridge.getSavings` / `dismissSaving` and open the linked views (`tests/renderer/CostTab.test.jsx`, `tests/renderer/CostPanel.test.jsx`, jsdom).
- **Texts**: `tests/main/i18nKeys.test.js` requires every new key in `sv.json` and `en.json`.

The IPC wiring in `ipc.js` and `preload/index.js` is a pass-through, tested through the handler bodies as with `loadRework`; no Electron-level test is added.

## Run

```bash
npx vitest run tests/main/savings.test.js tests/main/ledger.test.js tests/main/fileWrite.test.js tests/main/i18nKeys.test.js tests/renderer/CostPanel.test.jsx tests/renderer/CostTab.test.jsx
```

The whole suite with coverage (`npx vitest run tests/ --coverage`) is the evidence for the 80% line floor.

## Where it runs

Node (`main` project) and jsdom (`renderer` project). Not in a real browser engine.
