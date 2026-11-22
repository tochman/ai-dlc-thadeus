# Code Summary: U5 u5-fold-list (US-0415)

Branch `feat/US-0415` from `main`, nothing committed. All 12 plan steps done, test first.

## Files
- New `src/renderer/useFold.js`: `{folded, toggle, toggleProps}`; reads and writes `listFolded` through `getSettings`/`setSettings`; a failed read keeps the list open, a failed save keeps the state and logs.
- `src/main/settings.js`: `sanitize` keeps `listFolded` for `intents`, `features`, `editor` with boolean values only.
- `src/renderer/ProjectView.jsx` (the Intents sidebar only), `FeaturesView.jsx`, `editor/FileTree.jsx`: the toggle and `is-folded`; a click on the strip opens the column again.
- `theme.css`: the amber elbow toggle, the 28px strip, a transition only under `data-motion='full'`, off under `prefers-reduced-motion: reduce`; `.editor-view:has(> .file-tree.is-folded)` gives the editor the width.
- Locales `fold.hide`, `fold.show`. Tests: `settings` +3, new `useFold.test.jsx` (3), `ProjectView`, `FeaturesView`, `EditorPanel` +1 each.
- Docs: US-0415 set to 🚧 in `epic-04-branding-and-desktop.md` and `FEATURES.md`.

## Results
- Red runs failed as planned. Final: 8 files, 101 tests pass; ESLint 0 errors (9 older warnings, none in new code); Prettier clean.
- Not run here: other tests that mount ProjectView or FeaturesView (such as `AppShell.test.jsx`) and the full suite with coverage (Build and Test). `:has()` and the elbow look are checked only in jsdom, not in the built app.

## Deviations
1. The editor's grid and `<FileTree>` live in `ProjectView.jsx`, not `EditorPanel.jsx`. To keep `ProjectView.jsx` to the Intents sidebar, the toggle is in `src/renderer/editor/FileTree.jsx` (not in the plan's file list) and the editor gets the width through a `:has()` CSS rule. `EditorPanel.jsx` is unchanged; its test builds the same layout.
2. jsdom cannot fire a button's keyboard activation, so the hook test checks a native `<button type="button">` with `aria-expanded` and an `aria-label` that follow the state, rather than pressing Enter or Space.
