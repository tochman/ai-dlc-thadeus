# Unit Test Instructions: US-0210 model profile switch

## Framework

vitest 5.1 with the existing `vitest.config.mjs` (projects `main`, node, and `renderer`, jsdom with Testing Library and the Swedish locale). Nothing new to install or configure.

## Run this work's tests

Runner check before the first Red step (must pass on the unchanged tree):

```bash
npx vitest run tests/main/modelChoice.test.js
```

This work's tests, one command:

```bash
npx vitest run tests/main/modelProfiles.test.js tests/main/modelChoice.test.js tests/main/settings.test.js tests/main/ipc.test.js tests/main/i18nKeys.test.js tests/renderer/ModelProfilesSection.test.jsx tests/renderer/ProfileSwitchDialog.test.jsx
```

## Tests (Minimal: one per requirement, about 22)

| File | Covers |
|---|---|
| `tests/main/settings.test.js` | FR1.5 round trip; invalid parts fall back; AC1.1.6 bad name refused, earlier value kept |
| `tests/main/modelChoice.test.js` | `from` → `--from <name>`; bad name refused (NFR2) |
| `tests/main/modelProfiles.test.js` | FR2.2 command order, empty agents skipped; FR4.3 stop at first failure; tracker FR2.1, FR2.3, FR2.4, FR2.5, FR3.1, FR3.2, FR3.3 (archived counts as ended); saved profile names from `data.profiles` (FR1.2) |
| `tests/main/ipc.test.js` | `modelProfile:answer`: success saves `active` (FR4.1, FR4.2); no model table → message, nothing run (FR5.2); failure keeps `active` (AC1.3.6) |
| `tests/main/i18nKeys.test.js` | existing; new keys in both `sv.json` and `en.json` (NFR1) |
| `tests/renderer/ModelProfilesSection.test.jsx` | AC1.1.1–AC1.1.5 |
| `tests/renderer/ProfileSwitchDialog.test.jsx` | AC1.2.1–AC1.2.3, AC1.3.2, output and failure shown (FR4.2, FR4.3), native `<dialog>`, no `window.confirm` (NFR4) |

## Coverage

The project floor is 80% line coverage (team rule). Build and Test checks it on the full suite; a run of these files alone does not judge it. New code in `src/main/modelProfiles.js` should be covered in full by its own tests.

## Mocking and test data

- Commands: pass a fake `exec` to `runProfile` / `modelOptions` (the existing `{ exec }` option); no real `aidlc` runs.
- Settings: the existing `settings.test.js` setup with a temp `userData` under `tests/.tmp/`.
- Intents: plain arrays of `{ dirName, plan, scope, status }` objects; statuses `in-flight`, `complete`, `archived`.
- Renderer: mock `window.api` calls as the existing `ProjectSettingsView.test.jsx` and `CostRulesSection` tests do.
- NFR3 (within 2 s, debounce 300–800 ms) is not unit-tested: the existing watcher debounce is reused unchanged and checked by hand.
