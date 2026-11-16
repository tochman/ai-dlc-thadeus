# Code Summary: US-0024 The "Tokens over time" chart is drawn

## Changed

- `src/renderer/TokenDetail.jsx`: `ParentSize` gets `parentSizeStyles={{ width: '100%', height: CHART_H }}` (US-0024 FR1). Its default outer box is `height: 100%`, which is 0 px in a flex section with no set height, and its inner measuring box (`position: absolute; overflow: hidden`) then clipped the chart away.

## Created

- `tests/renderer/TokenDetailChartSize.test.jsx` (2 tests, real `@visx/responsive`, a no-op `ResizeObserver` stub as in `TerminalPanel.test.jsx`):
  - FR1/FR3: two readings → `.token-detail-size` has height `260px`. Red before the fix: `expected '100%' to be '260px'`.
  - FR2: one reading → the one-sentence message, no chart box (guard; passed before the fix).

## Results

- Red recorded before the source edit; Green: 16/16 in the two files; renderer suite 39 files, 367 tests passed. Prettier clean.
- Full suite left to Build and Test.

## Not proven here

jsdom does no layout: the tests show the box gets its height, not that the chart is visible. Check it in the built app before the v0.2.8 tag.

## Deviations

None from the plan.
