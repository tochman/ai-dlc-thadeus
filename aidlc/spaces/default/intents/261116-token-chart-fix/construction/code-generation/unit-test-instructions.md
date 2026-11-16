# Unit Test Instructions: US-0024 The "Tokens over time" chart is drawn

## Framework

vitest 5.1.0, existing `vitest.config.mjs`, renderer project (jsdom, Swedish locale). No new configuration.

## Run this work's tests

```bash
npx vitest run tests/renderer/TokenDetailChartSize.test.jsx tests/renderer/TokenDetail.test.jsx
```

## Tests (Minimal, one per requirement)

| File | Covers |
|---|---|
| `tests/renderer/TokenDetailChartSize.test.jsx` | FR1 + FR3: the real `ParentSize` box has the chart's height (regression, red before the fix) |
| `tests/renderer/TokenDetailChartSize.test.jsx` | FR2: one reading shows the one sentence, no chart box |
| `tests/renderer/TokenDetail.test.jsx` (existing) | FR1: series, hover and focus figures; stays green |

## Expected coverage

The project's 80% line floor in `vitest.config.mjs` is checked by Build and Test on the full suite. No threshold changes.

## Mocking and test data

- The new file does **not** mock `@visx/responsive`: the bug lives in its box styles. jsdom does no layout, so the test checks the inline `height` on `.token-detail-size`, not a measured size.
- Readings are built in the test like the existing `TokenDetail.test.jsx` ones; `window.bridge` is mocked the same way.
