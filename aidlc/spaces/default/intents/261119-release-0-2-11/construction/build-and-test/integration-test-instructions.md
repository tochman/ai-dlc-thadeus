# Integration Test Instructions — v0.2.11 release

The only boundary this release touches is between the feature docs and the intent records, and the repo-level checks already cover it:

- `npx vitest run tests/main/featureDocsStatus.test.js`: reads `docs/FEATURES.md`, every epic file, `intents.json` and every intent's `aidlc-state.md`, and fails when a built or delivered story's marker lags (now only intents that ran Code Generation count as delivered).
- `npx vitest run tests/main/releaseVersion.test.js`: reads `package.json`, `package-lock.json`, `docs/releases/0.2.11.md` and the epic headings of its slice stories.

Both run in Node, with no setup beyond `npm ci`. They are part of the full suite and of CI's `verify` job.
