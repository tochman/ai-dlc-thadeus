# Code Summary — US-0055 A failed replay is kept after a real planning commit

## Change

- `src/main/planningRecord.js`: new `markWaiting(userData, root, ids, reasons)` keeps entries `pending` with a `reason` (`reasons`: id → text). `markCommitted` now drops `reason`.
- `src/main/planningSync.js`: `replayIn` returns `failed` as `{id, reason}`: the error message, or for a clash the file it clashed in. `replayStep` leaves failed ids out of `going`, so they are not in the commit and not in its subject. It calls `markWaiting` for them. The redundant `!failed.includes` filter in `already` is gone. `waitingList` passes `reason` on.
- `src/renderer/FeaturesView.jsx`: `entryText` adds `features.planning.entry.failed` ("Could not be done again: {reason}") when an entry has a reason. The key is in `sv.json` and `en.json`.

## Tests (test first)

| Test | Red |
|---|---|
| `planningRecord.test.js` US-0055 FR1 | `TypeError: markWaiting is not a function` |
| `planningSync.test.js` US-0055 AC1 | subject `docs: plan US-0101, US-0999 for v1.0.0`, expected `docs: plan US-0101 for v1.0.0` |
| `planningSync.test.js` US-0055 AC2 | `pending: 0` after the push, expected `1` |
| `planningSync.test.js` US-0055 AC3 | `pending: 0` after the push, expected `1` |
| `FeaturesView.test.jsx` US-0055 AC1 | `'Release v0.2.7 · Storys: US-0604 '` had no reason |

The AC3 clash comes from a `vi.mock` of `releases.js`. Its `setStoryRelease` returns `{conflict}` for one story and runs as normal for every other story, because a replay cannot be made to clash with real files.

## Result

The scoped run (4 files) passed 109 of 109 (104 before). ESLint and Prettier are clean on the changed files.
