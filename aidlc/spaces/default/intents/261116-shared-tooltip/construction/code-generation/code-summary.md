# Code Summary: US-0414 one LCARS tooltip across the app

All 20 plan steps were built test first, and every Red run was recorded before its code.

- **Tests:** `npx vitest run tests/` gives 118 files and 1459 tests, all passing. On the unchanged tree it was 114 files and 1434 tests.
- **Lint and format:** `npx eslint .` gives 0 errors and the 24 warnings the repo already had. `npx prettier --check src tests` is clean.

## Files

- **New:**
  - `src/renderer/Tooltip.jsx`
  - `src/renderer/tooltipPlacement.js`
- **Changed:**
  - `src/renderer/App.jsx`, `IntentList.jsx`, `IntentDetail.jsx`, `Pipeline.jsx`
  - `CostPanel.jsx`, `CostTab.jsx`, `ConfigEdit.jsx`, `FeaturesView.jsx`
  - `ArtifactReader.jsx`, `ResumeButton.jsx`, `TerminalPanel.jsx`, `Lcars.jsx`
  - `editor/EditorPanel.jsx`, `TokenDetail.jsx`, `theme.css`
- **Tests:**
  - New: `tests/renderer/Tooltip.test.jsx`, `tooltipPlacement.test.jsx`, `noNativeTitle.test.jsx`, `CostTab.test.jsx`.
  - Updated: `ResumeButton`, `IntentList`, `TerminalPanel`, `CostPanel`, `TokenDetail`.

## Key decisions

- **`Tooltip({ text, focusText, focusable, children })`**
  - It opens at once on focus, and on hover after `HOVER_DELAY_MS = 300`. It closes on blur, leave, Esc and scroll.
  - It renders through a portal into `document.body`, with `role="tooltip"` and an id from `useId`. While it is open, the anchor's `aria-describedby` points to it, and an existing `aria-label` is kept.
  - It is placed by `placeTooltip`.
  - With no text, the child renders unchanged.
- **Button parts (FR2.3):** the parent button shows `text` on hover and `focusText` (the parts' texts, one per line) on focus. Only the innermost tooltip under the pointer opens.
- **Look and layering:** one `.lcars-tip` class, at `z-index: 60`. It sits above the notices (40, 50) and below the dialogs (100), and uses `white-space: pre-line`. `.token-detail-row-tip` is removed.
- **Chart tooltip:** it uses `className="lcars-tip token-detail-tooltip"` and a left clamp through the new `chartTipLeft`.
- **Resume:** `aria-disabled` plus a click guard. Its CSS `:disabled` rules became `[aria-disabled='true']`.
- **Locales:** no new keys were needed, because every label already went through `t()`.

## Deviations from the plan

- **Test file names:** the placement and guard tests are named `.test.jsx`, because the renderer project picks up only `*.test.jsx`. The instructions allowed for this. Their scoped command still names `.test.js` for those two files, so Build and Test runs them under their `.test.jsx` names.
- **StatusBadge (inventory row 25):**
  - Where it stands alone (the release story list), it is focusable.
  - In the three places where it sits inside a row button, it is hover-only, because a focusable element inside a button is invalid.
  - Those buttons do not add its text to a combined focus text, because the inventory did not list them as button parts.

## Shortcuts (`ponytail:`)

- The hover delay is a fixed 300 ms, with no shared hover-intent manager.

## Not executed here

- **Coverage floor:** a local run gave 90.96%. Build and Test checks it.
- **Built app:** placement in the real window, the hover feel, and stacking against dialogs were not seen in the running app, because jsdom does no layout. They are left to the hand check of the `.dmg`.
- **Disabled intent rows (`missingOnDisk`):** these rows still use native `disabled`, so their tooltip can't open in Chromium.
