# Integration Test Instructions: US-0212 THADEUS cost rule pack

## Boundaries covered

- IPC: `costRules:status`, `costRules:preview`, `costRules:apply` in `tests/main/ipc.test.js`, with the preview held in `p.costRules`.
- Bridge: the three calls in `tests/main/preload.test.js`.
- Files and compile: `tests/main/costRules.test.js` writes a temp project under `tests/.tmp/cost-rules`, applies and removes the pack, and checks restore when the injected compile fails (FR5.4).
- Write guard: `tests/main/fileWrite.test.js` lists `costRules.js` among the modules allowed to use `writeAtomic` (SD36).
- UI mount: `tests/renderer/AppShell.test.jsx` (jsdom) checks the Configuration arm shows the sub-block.

## Run

```bash
npx vitest run tests/main/costRules.test.js tests/main/ipc.test.js tests/main/preload.test.js tests/main/fileWrite.test.js tests/renderer/AppShell.test.jsx tests/renderer/CostRulesSection.test.jsx
```

The full suite with coverage: `npx vitest run tests/ --coverage` (80% line floor in `vitest.config.mjs`).

## Data

Temp project files only; the compile is injected, never run for real. Renderer tests run in jsdom, not a real browser.
