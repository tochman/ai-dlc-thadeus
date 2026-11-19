# Unit Test Instructions — v0.2.10 release

## Framework

vitest 5.1.0, `main` project (node). No new configuration.

## Run this work's tests

```bash
npx vitest run tests/main/releaseVersion.test.js tests/main/featureDocsStatus.test.js
```

## Tests

`tests/main/releaseVersion.test.js` (version-generic, reads `package.json`): plan exists, plan title, slice all ✅, lock file version, plus two new ones: each slice story is "✅ Released in v<version>" in its epic heading and slice row, and no slice story still says "for v<version>" in a Status line or `FEATURES.md` row. `tests/main/featureDocsStatus.test.js` must stay green.

## Coverage

The project floor is 80% line coverage; Build and Test checks it on the full suite. This change touches no measured source.

## Test data

The repository's own docs; no fixtures or mocks.
