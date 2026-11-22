# Code Summary: U3 u3-speckit-setup (US2.1 / US-1405)

The code is on branch `feat/US-1405`, made from `feat/US-1401`. It was built test first (Red, Green, Refactor) as the approved plan says. Nothing was pushed or merged.

## Files

| File | Change |
|---|---|
| `src/main/speckitSetup.js` | New. `getSpeckitSetupInfo(root, { harness, exec })` returns the preview: whether `specify` answers and its version, the harnesses found, the chosen harness, the exact command, what Spec Kit adds, and whether the folder already has files. `runSpeckitSetup(root, { harness }, info, { exec })` runs `specify init --here --force --non-interactive --integration <h>` through `runFixed`, with a 120 s timeout and one run per root at a time. |
| `src/main/tools.js` | `specify` is added to `TOOL_IDS`, so a saved path is honoured (R-03). |
| `src/main/ipc.js`, `src/preload/index.js` | `speckit:setupPreview(projectId, harness?)` stores the preview per project. `speckit:setup(projectId, harness)` runs with that preview and detects the harnesses again after a success. |
| `src/renderer/SetupSpeckit.jsx` | New. An LCARS panel: the preview, the missing-CLI hint with Retry, the harness picker for 0 or 2 harnesses, the command shown before Run, and the output and reason after a success, a failure or a timeout. |
| `src/renderer/ProjectView.jsx`, `theme.css` | For a folder with no framework, two LCARS switch blocks (`SetupChoice`) choose between AI-DLC (the default, as before) and Spec Kit. |
| `src/renderer/SettingsView.jsx` | Its own copy of the tool list gains `specify`, so the path can be chosen in Tools. |
| `src/shared/locales/sv.json`, `en.json` | `speckitSetup.*`, `setup.chooseFramework`, `setup.framework.*`, `settings.tools.specify` and `settings.tools.neededFor.specify`. |
| `docs/FEATURES.md`, `docs/features/epic-14-spec-kit.md` | US-1405 set to 🚧, then ✅ Done, for v0.3.0, with its criteria ticked. |

Tests: two new files, `tests/main/speckitSetup.test.js` (13 tests) and `tests/renderer/SetupSpeckit.test.jsx` (7). Four were extended: `ipc` (2 tests), `settings` and `toolCards` in `tests/main/`, and `ProjectView` (2 tests) in `tests/renderer/`.

## Key decisions

- The version check reuses `probeTool` from `tools.js`. A missing `specify` resolves to `specifyOnPath: false` and never throws.
- Failures are classified from what `runFixed` rejects with: `killed` gives `timeout`, `ENOENT` gives `notFound`, and anything else gives `failed`. The output is the error's `stdout`. The message, which includes `stderr`, is also shown.
- `adds` lists `.specify/` and the harness's own folder (`.claude/` or `.opencode/`). The real run put `.claude/skills/` inside `.claude/`.
- A folder that holds only `.git` counts as empty, so the "existing files stay" note is not shown for a fresh repository.
- The refusals in BR3.2 and BR3.3 are made in `runSpeckitSetup`. The IPC handler only passes the stored preview through.

## Real-tool check (Step 13)

Run once against `specify 1.4.3`, in `tests/.tmp/speckit-real/` (ignored by git, removed afterwards), with a `.claude/` folder and a `README.md`:
- The preview found `specify 1.4.3` and the harness `claude`, and showed the command `specify init --here --force --non-interactive --integration claude` with `notEmpty: true`.
- The run returned `ok: true` after about 0.9 s.
- Afterwards the folder held `.claude/`, `.specify/` and `README.md`. `.claude/` held `skills/`, and `README.md` was unchanged. No `.git` was created.
- opencode was not run for real.

## Test results

- Full suite (`npx vitest run tests/ --coverage`): 155 files, 2,048 passed, 1 skipped, 0 failed.
- Line coverage: 92.5% overall. New files: `speckitSetup.js` 100%, `SetupSpeckit.jsx` 94.11%. Changed files: `tools.js` 97.61%, `ipc.js` 90.7%. `ProjectView.jsx` is at 68.15% (it was 67.1% after U1). It is a large existing file, and the lines U3 added are covered.
- ESLint: 0 errors and 29 warnings, all of them the existing `react-hooks/exhaustive-deps` kind. Prettier: clean.
- Not run: the Playwright end-to-end tests and the manual `.dmg` check.

## Deviations from the plan

- `toolCards.test.js` also lists the tools, so it was updated in its own commit after the first full run showed it failing.
- The renderer's own `TOOL_IDS` in `SettingsView.jsx` and its two labels were added. Without them a saved `specify` path could not be set in the app.
- Five keys beyond the list in `frontend-components.md` were added: `speckitSetup.found`, `pickPlaceholder`, `adds`, `existing`, and `setup.framework.aidlc`/`speckit`.
- `SetupSpeckit` takes `root` and `onApplied` as well as `projectId`.
