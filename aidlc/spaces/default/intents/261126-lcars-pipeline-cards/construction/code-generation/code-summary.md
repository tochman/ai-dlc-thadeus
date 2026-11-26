# Code Summary — US-0412 LCARS pipeline cards

## Files changed

| File | Change |
|---|---|
| `src/renderer/Pipeline.jsx` | exported `stageChanges(prev, stages)`; `useStageEffects` hook (previous render in a ref, effects cleared after 900 ms); number in `.stage-num`, body starts with the status; `--i` on each `li`; `.stage-sweep` span (keyed by a counter), `is-flashing`, `is-new` segments |
| `src/renderer/IntentDetail.jsx` | `<Pipeline key={detail.dirName}>`, so another intent's pipeline mounts fresh |
| `src/renderer/theme.css` | 36 px elbow, `.stage-num`, height 84 px, the stage name wraps; done (solid) and skipped (dashed) elbow outlines; keyframes `stage-power`, `stage-sweep`, `stage-flash`, `stage-fill`, used only under `:root[data-motion='full']` |
| `tests/renderer/Pipeline.test.jsx` | 7 `stageChanges` tests, 6 effect tests, 1 clear-after-900-ms test; 2 tests updated to the new body text |
| `tests/renderer/IntentDetail.test.jsx` | 1 test: another `dirName` gives a new pipeline element |
| `tests/main/theme.test.js` | US-0412 block, 6 tests |

No `sv.json` / `en.json` change: no new text (NFR4).

## Key decisions

- `stageChanges` returns `{ effect?: 'sweep' | 'flash', litFrom?: n }` per slug; a card that becomes done can flash and fill at once.
- `--i` counts the cards on screen across phases; delay `min(--i, 9) × 40 ms` + 240 ms keeps the last card within 600 ms.
- The sweep band rests off the card (`translateX(-100%)`, clipped), so it never shows under Reduced or Off.
- The stage name is upper case and wraps (`overflow-wrap: anywhere`) instead of being cut with an ellipsis, as the mockup shows.

## Tests

- TDD: Red runs recorded for Steps 3 (7 failing), 6 (8 failing) and 9 (6 failing), each then made green.
- Scoped command `npx vitest run tests/renderer/Pipeline.test.jsx tests/renderer/IntentDetail.test.jsx tests/main/theme.test.js`: 74 of 74 passed (54 before).
- ESLint and Prettier pass on the changed files.

## Not executed here

- The full suite and the 80% coverage floor: left to Build and Test (`npx vitest run tests/ --coverage`).
- The look in the running app (a long slug at 1280 px, the done and skipped elbow outlines, the motion itself): jsdom does not render CSS; to check by eye.

## Deviations and open points

- Step 2 ran all three test files, not two; one extra test (the 900 ms clear) was added.
- The flash plays on the done look: the card switches to the transparent done style as it starts flashing, so it brightens the grey outline, not a steel card as the mockup draws. Keeping the steel fill during the flash would need `box-shadow` in the keyframes (NFR1 allows it; this plan's test limits keyframes to `transform`, `opacity`, `filter`). To decide after seeing it in the app.
