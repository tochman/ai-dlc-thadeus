# Unit Test Instructions: US-0047

## Setup

vitest 5.1.0 is already set up in `vitest.config.mjs`. `tests/main/thadeusSync.test.js` uses real git repositories in a temporary folder. If `TIMED` in `vitest.config.mjs` lists it, it runs in the `scripts` project, otherwise in `main`; the command below names no project, so it works in both cases.

## Run these tests

```bash
npx vitest run tests/main/thadeusSync.test.js
```

## Expected coverage

The project floor is 80% line coverage over `src/**`. Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`); this command does not judge it, and the threshold is never lowered.

## Mocks and test data

Reuse the file's own helpers (`setup`, `waiting`, `write`, `atOrigin`, `originLog`). Nothing is mocked. For AC3 the record file is written by hand at `recordFile(userData, clone)`, since `addThadeus` refuses an invalid path once the fix is in.
