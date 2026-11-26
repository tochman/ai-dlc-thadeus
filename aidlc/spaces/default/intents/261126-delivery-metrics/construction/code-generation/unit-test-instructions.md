# Unit Test Instructions — US-1304 Delivery metrics

## Framework

vitest 5.1.0, existing `vitest.config.mjs` (projects `main`, node, and `renderer`, jsdom with the Swedish locale). Nothing new to install or configure.

## Run this work's tests

```bash
npx vitest run tests/main/delivery.test.js tests/main/platforms.test.js tests/main/ipc.test.js tests/renderer/VelocityView.test.jsx tests/main/velocity.test.js tests/main/i18nKeys.test.js
```

The first test-first cycle (Step 2) runs `npx vitest run tests/main/delivery.test.js`; it fails until `src/main/parsers/delivery.js` exists.

## Expected coverage

- About 22 new tests: 13 in `delivery.test.js`, 4 in `platforms.test.js`, 1–2 in `ipc.test.js`, 5 in `VelocityView.test.jsx`.
- The project floor is 80% line coverage (v8, `src/**`). Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`), not on this scoped run.

## Mocking

- `delivery.js` is pure: pass plain arrays (stories, tags `{name, date}`, fix stories, `{tag, prerelease}` releases, `{createdAt, mergedAt, changes}` pulls) and a fixed `nowMs`.
- Platform reads: inject `exec` (gh/glab) or `fetch` (Bitbucket) as the existing `platforms.test.js` does.
- IPC: stub the platform functions as the existing `ipc.test.js` pull request tests do.
- View: stub `window.bridge.getVelocity` with a fixture that includes `delivery`.

## Test data

Small inline fixtures per test: three tags over two months, one prerelease, one fix story with `Fault in: v0.1.1` and one without, three merged pull requests (one with two changes-requested reviews). Times are fixed ISO strings, never `Date.now()`.
