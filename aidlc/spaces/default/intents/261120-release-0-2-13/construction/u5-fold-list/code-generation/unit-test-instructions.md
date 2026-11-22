# Unit Test Instructions: U5 u5-fold-list

## Setup
vitest 5.1.0, already set up (`main` in node, `renderer` in jsdom with the Swedish locale). Nothing to install.

## Run this Unit's tests
```
npx vitest run tests/main/settings.test.js tests/renderer/useFold.test.jsx tests/renderer/ProjectView.test.jsx tests/renderer/FeaturesView.test.jsx tests/renderer/EditorPanel.test.jsx tests/main/i18nKeys.test.js tests/renderer/noNativeTitle.test.jsx tests/main/featureDocsStatus.test.js
```
`tests/renderer/useFold.test.jsx` is new (Step 6); before then, run the same command without it. The rest is green on the unchanged code.

## What is tested
- `settings.test.js`: 3 cases for `listFolded` in `sanitize` (AC5.1.3).
- `useFold.test.jsx` (new): 3 cases for the stored state per view, saving, and the button's keyboard, `aria-expanded` and name (AC5.1.3, AC5.1.4).
- `ProjectView.test.jsx`, `FeaturesView.test.jsx`, `EditorPanel.test.jsx`: 1 case each for folding and the kept list state (AC5.1.1, AC5.1.2).
- `i18nKeys.test.js`, `noNativeTitle.test.jsx`, `featureDocsStatus.test.js`: stay green.

## Mocking and test data
- `window.bridge.getSettings` and `setSettings` are stubs holding an in-memory settings object; the tests check what `setSettings` was called with.
- Reduced motion is CSS only, so it is not asserted in jsdom; the `@media (prefers-reduced-motion: reduce)` rule is checked by reading `theme.css` in the hook test.

## Coverage
The project's 80% line-coverage floor (v8, `src/**`) is checked by Build and Test on the full suite (`npx vitest run tests/ --coverage`). This command is not run with `--coverage`.
