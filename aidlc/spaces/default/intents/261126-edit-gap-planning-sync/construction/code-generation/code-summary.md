# Code Summary: US-0051 and US-0053

## Files

- `src/renderer/SpeckitRules.jsx`, `src/renderer/theme.css`: the constitution wrapper is a grid with a `--gap` between the Edit button (start-aligned) and the file view (US-0051).
- `src/main/planningSync.js`:
  - `replayStep` marks a pending content entry whose text is already at HEAD as committed, and leaves it out of the commit and its subject. When the commit finds nothing at all, the remaining pending entries are marked committed too, except those that failed or clashed in the replay (US-0053 FR1).
  - `replayIn` also returns `failed`.
  - `sourcesOf` adds local `main` whenever it is ahead of origin, checked out or not. The new `followPush` fast-forwards a checked-out `main`; one that is not checked out moves with `update-ref` only when it is an ancestor of the pushed commit (US-0053 FR2).
- Tests: `tests/e2e/speckitLayout.spec.js` L7; `tests/main/planningSync.test.js`, new US-0053 block (a)–(d).
- Docs: US-0051 and US-0053 ✅ Done, for v0.3.1, in `docs/features/epic-00-fixes.md` and `docs/FEATURES.md`.

## Tests run

- Each new test was red before its fix: L7 (gap 0 at 1280 and 1920), (a) pending 1, (b) subject named US-0101, (c) entry dropped offline, (d) nothing pushed.
- Green: `npx vitest run tests/main/planningSync.test.js` 40 passed (36 old, 4 new); `npx playwright test tests/e2e/speckitLayout.spec.js` 8 passed; `tests/main/featureDocsStatus.test.js` 10 passed; ESLint and Prettier clean on the touched files.
- Not run here: the full suite with coverage, which Build and Test runs.

## Deviations

- Actions that failed in the replay are kept out of the new "nothing to commit" path, so they are not lost after a push. The older path (after a real commit) still marks every entry in `going` as committed, failed ones included. That is a gap that was already there; it is outside this fix.
- Test (b) adds its second entry with `addContent` on a second file: a new edit to the same file replaces the existing entry.
- The `update-ref` branch rarely moves anything. Without a rebase the pushed commit is `main`'s own tip; after a rebase `main` is no longer an ancestor, so it stays put and is logged. It is harmless.
