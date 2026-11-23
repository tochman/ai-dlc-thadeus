# Code Summary: US-0044, the intent view fits the window

Branch `fix/US-0044` (worktree `.claude/worktrees/fix-0044`), three commits on `origin/main`: `1fa5858` story to 🚧, `50be565` red test, `aad6f72` fix.

## Cause (measured in the built app at 1280 px)

- **AC1, AC2:** the frame body fit (490 px in a 718 px frame). The overflow came only from the title in the top bar: `flex-shrink: 0`, so a long intent name (1120 px) pushed the frame's scroll width to 1566 px. The tabs and the Units graph were clipped because the whole view had grown wider. The Units graph already scrolls in `.bolt-dag`.
- **AC3:** the body's top padding (176 px) clears the elbow's diagonal at the body's left edge, which leaves a 94 px band under the 42 px top bar.
- **AC4:** the arm was `position: absolute`, so the frame never grew to hold it. On a short tab (Timeline, Velocity) the Live tokens panel ran past the lower curve.

## Changes

- `src/renderer/theme.css`
  - The top-bar title shrinks with an ellipsis, and the sub label keeps its width.
  - `.lcars-df-in` is `display: flow-root` with a `--df-top` padding. The arm is floated into the left padding (`calc(286px - var(--df-top))` from the top, 70 px bottom margin), so every diagonal frame grows to hold its arm.
  - In the intent frame: `--df-top: 104px`; the head is indented 100 px so it sits beside the diagonal; 16 px of space under the tabs. The narrow (≤560 px) layout resets the indent.
- `src/renderer/Lcars.jsx`: the DiagonalFrame title carries the whole name as its `title` tooltip.
- The tabs stay on one row, as US-0417 decided (`tests/main/theme.test.js`); once the title stopped widening the frame, they fit.

## Tests

`tests/e2e/intentLayout.spec.js` runs 4 checks at 1280 and 1920 px on a copy of `tests/fixtures/project` (long name, 12 stories, a 9-unit graph, a NOT-READY review, live tokens). AC4 checks every tab.
- **Red on the old code:** AC1 and AC2 failed on scrollWidth 1566 vs 718 (1867 vs 1358 at 1920). AC3 failed on a 94 px gap (40 max). AC4 failed on Velocity and Timeline, with the token view's bottom 33 and 15 px under the curve.
- **Green after the fix:** 8/8. `planning.spec.js` 2/2, theme, IntentDetail, Lcars and TokenView 60/60, ESLint and Prettier clean.

## Notes

- The tooltip and ellipsis are a choice: a full name cannot fit beside the elbow in a 718 px frame. The name stays readable in the intent list and in the tooltip.
