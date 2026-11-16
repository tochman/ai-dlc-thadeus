# Unit Test Instructions: US-0414

## Framework

vitest 5.1.0 with `@testing-library/react` in the `renderer` project (jsdom, Swedish locale), already set up in `vitest.config.mjs`. Nothing new to install.

## Runnable before the first Red step

```bash
npx vitest run tests/renderer/TokenDetail.test.jsx
```

## This work's tests

```bash
npx vitest run tests/renderer/tooltipPlacement.test.js tests/renderer/Tooltip.test.jsx tests/renderer/noNativeTitle.test.js tests/renderer/ResumeButton.test.jsx tests/renderer/TerminalPanel.test.jsx tests/renderer/IntentList.test.jsx tests/renderer/CostPanel.test.jsx tests/renderer/CostTab.test.jsx tests/renderer/TokenDetail.test.jsx tests/main/i18nKeys.test.js
```

The renderer project's include pattern is `tests/renderer/**/*.test.jsx`. If `.test.js` files under `tests/renderer/` are not picked up, name the placement and guard tests `.test.jsx`, and update this command to match. Do not change the config's include pattern for it.

About 12 new tests, one per requirement plus a happy path per component:
- **Placement (FR1.4):** below by default, flip above, sideways shift, clamp.
- **Component (FR1.1–FR1.3, FR1.5):** opens on focus, on hover after the delay, closes on Esc; `role` and `aria-describedby`; renders in `document.body`.
- **Guard (FR2.1):** no `title=` attribute on a DOM element in `src/renderer`.
- **Sites:** Resume `aria-disabled` (FR2.4); the "no command" hint (FR2.5); a button's combined text on focus (FR2.3); plain text focusable (FR2.2); the row tip and the chart look (FR3).
- **Locales (FR4.1):** `i18nKeys.test.js` checks that both locales have the same keys.

## Expected coverage

The 80% line-coverage floor is set for the whole project. Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`). A scoped run does not judge it.

## Mocking and test data

- **Layout:** jsdom does no layout. The component tests stub `getBoundingClientRect`, `innerWidth` and `innerHeight` with `vi.spyOn`. Placement is tested as a pure function with plain numbers.
- **Hover delay:** use `vi.useFakeTimers()`.
- **Portal:** query tooltips through `screen` (`document.body`), not the render container.
