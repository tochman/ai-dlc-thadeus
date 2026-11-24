# Unit test instructions

## Framework

vitest 5.1.0, already set up (`vitest.config.mjs`). Nothing to install.

## Run this work's tests

The release checks:

```bash
npx vitest run tests/main/featureDocsStatus.test.js tests/main/releaseVersion.test.js tests/main/releasesPlan.test.js tests/main/releases.test.js
```

## Coverage

There is no new code. The 80% line floor for the whole project is checked by Build and Test on the full suite, and by the tag's `verify` run.

## Mocking and test data

None. The checks read the real `package.json`, `docs/FEATURES.md`, the epic files and `docs/releases/0.2.15.md`.
