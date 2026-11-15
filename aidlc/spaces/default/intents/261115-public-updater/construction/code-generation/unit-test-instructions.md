# Unit Test Instructions: US-0413

- **Framework:** vitest 5.1.0, project `main` (node). No new configuration.
- **Run this work's tests:** `npx vitest run tests/main/updater.test.js tests/main/i18nKeys.test.js`
- **Runnable before the first Red:** yes; `tests/main/updater.test.js` passes today with 12 tests.
- **Expected:** 20 tests in `updater.test.js` (12 existing, 8 new), all green; the i18n keys test green.
- **Coverage:** the project's 80% line floor is not set up yet (team.md); Build and Test checks the full suite.
- **Mocking:** `fetch` is injected into `createUpdater`. The fake returns `{ ok, status, json(), body }`, where `body` is a `ReadableStream` of `Uint8Array` chunks, or it rejects with a `TypeError('fetch failed', { cause: { code } })` or a `DOMException('…', 'TimeoutError')`. `fakeFs.open` returns a handle whose `write` appends to the in-memory file and whose `close` resolves. `gh` stays faked through `fakeExec`.
- **Test data:** API answers shaped like `GET /repos/tochman/aidlc-dash/releases/latest` (`tag_name`, `draft`, `prerelease`, `body`, `assets[].name/size/browser_download_url`), built by a `apiRelease(tag)` helper next to the existing `release(tag)`.
