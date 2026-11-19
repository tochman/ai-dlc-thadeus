# Code Summary — v0.2.11 release

## What changed

| File | Change | Requirement |
|---|---|---|
| `package.json`, `package-lock.json` | Version 0.2.10 → 0.2.11 | FR1 |
| `docs/features/epic-00-fixes.md` | US-0032 and US-0033 headings and the EPIC-00 Status line say "✅ Released in v0.2.11" | FR2 |
| `docs/FEATURES.md` | EPIC-00 row says "released in v0.2.11" for both stories | FR2 |
| `docs/releases/0.2.11.md` | Slice rows say "✅ Released in v0.2.11"; the Status-lines-and-rows checklist item is ticked | FR2 |
| `tests/main/featureDocsStatus.test.js` | New `storiesFromIntents`: a finished intent counts its stories as delivered only when its Code Generation ran; one new unit test | Step 3b (person's request) |

## Tests

- Red (Step 2): the release test failed on the "Released in v0.2.11" checks after the bump. Step 3b's repo check failed on US-1401–US-1407 (Ideation-only intent `261119-spec-kit-ideation`).
- Green: `npx vitest run tests/main/releaseVersion.test.js tests/main/featureDocsStatus.test.js`: 15 passed, 1 skipped (the v0.2.9-only check).
- Refactor: Prettier on the changed files; same run green.

## Left open

- US-0032's criterion "an agent on `main` that follows the rule leaves exactly one commit, the app's" is unticked: it is a hand check, not yet made. So the checklist item "every story's acceptance criteria are ticked" stays open for Deployment Execution (FR3), with the `.dmg` and tag items.
- The full suite, ESLint and Prettier on everything, and the release PR's CI: Build and Test (FR1.1).
