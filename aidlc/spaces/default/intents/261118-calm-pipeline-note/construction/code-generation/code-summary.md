# Code Summary: US-0028 calm pipeline note

## Files changed

| File | Change |
|------|--------|
| `src/renderer/Pipeline.jsx` | The note now shows only when `hasGraph` is false and at least one stage is `done` (`timingsElsewhere`); it has `data-testid="pipeline-timings-note"`. The header comment names US-0028. |
| `src/shared/locales/sv.json`, `en.json` | New calm text for `pipeline.noGraph`; same key, so the key check stays green. |
| `tests/renderer/Pipeline.test.jsx` | `describe('runtime-graph note (US-0028)')` with 3 tests. |
| `docs/features/epic-00-fixes.md`, `docs/FEATURES.md`, `docs/releases/0.2.10.md` | US-0028 set to 🚧 In progress. |

## Decisions

- The key `pipeline.noGraph` is kept and only its text changes, so no locale key is added or removed.
- A stage counts as done when its status is `done`, the status the pipeline already uses for its cards.
- FR3 needs no code: `buildDetail` (`src/main/projectService.js`, lines 246–251) adds a warning only when the file exists but cannot be read, and `IntentDetail.jsx` (lines 241–245) shows it as `banner banner-warn`. Neither file changed.

## Tests

- Red: 2 failed before the fix (FR1 still showed the old text; FR2 found no `pipeline-timings-note`).
- Green: `npx vitest run tests/renderer/Pipeline.test.jsx tests/main/i18nKeys.test.js`, 14 tests passed.
- `npx eslint` and `npx prettier --check` on the changed files: clean.

## Not run in this stage

- The full suite: Build and Test runs it once.
- Coverage: no coverage tool is set up yet (team rule, still to be added), so the 80% floor cannot be measured.

## Deviations from the plan

- The FR1 test also checks that no text naming `runtime-graph.json` is shown, so it fails without the fix.
- The `FEATURES.md` entry "US-0028 and US-0029 planned" is split so that US-0028 can show 🚧.
- The Step 2 baseline ran only `Pipeline.test.jsx`; the key test first ran after Green.
