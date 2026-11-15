# Code Summary: US-0413, update from the public release without `gh`

## Files changed

- `src/main/updater.js`: `fromApi` (exported), `netReason`, injected `fetch`, `fetchOk`, `withFallback`, `publicRelease`, `fetchTo`, `ghDownload` (the old `gh` download, moved out with its polling progress). New header comment.
- `tests/main/updater.test.js`: `fakeFetch`, `apiRelease`/`apiAsset`, `json`/`bytes` answers, `fakeFs.open`; 8 new tests.
- `src/shared/locales/{sv,en}.json`: `settings…tools…gh` reworded; new `update.tryLater`, `update.timedOut`, `update.diskFull`, `update.httpStatus`.
- `tests/renderer/SettingsView.test.jsx`: one expectation now matches the new `gh` text.

## Key decisions

- The public step runs first. When it fails, the `gh` step runs once. If `gh` is missing (`ENOENT`), the public reason is shown. If `gh` ran and failed, its own reason is shown, so `ghLoggedOut` and `noAccess` keep their use (requirements assumption 2).
- Refusals (`assertOwnAsset`) run before any fetch, and the checksum check runs after the fallback. Neither ever falls back (FR5.1).
- `fetchTo` streams `res.body` into `fs.open(file, 'w')`, sends `{received, total}` per chunk, and removes its own partial file on any failure.
- `netReason` is the one function for HTTP status, timeout, full disk and no connection. Both the check (`unavailableReason`) and the download use it.
- `ponytail:` Node's `fetch` ignores the system proxy. Behind a proxy, the `gh` fallback carries the update.

## Tests

- Red (before the code): 8 of 19 failed, all of them the new tests.
- Green: `updater.test.js` passes 19 of 19, and `i18nKeys.test.js` passes 4 of 4.
- Full suite `npx vitest run tests/`: 104 files and 1350 tests, all green.

## Not run

- A live check against api.github.com and a real download. The tests do not use the network, so this belongs to the manual `.dmg` check before the release.
- Coverage. The 80% floor is not set up yet (team.md).

## Deviations

- The plan expected 12 existing tests, but there were 11, so the file now has 19 tests, not 20.
- The locale files are in `src/shared/locales/`, not in `src/renderer/locales/`.
- One more key than planned, `update.timedOut`. The only timeout text that existed, `errors.timeout`, says "10 s".
- The existing ENOENT case in the gh-reasons test now expects the public reason (FR5).
- `SettingsView.test.jsx` was updated for the FR6 text.
