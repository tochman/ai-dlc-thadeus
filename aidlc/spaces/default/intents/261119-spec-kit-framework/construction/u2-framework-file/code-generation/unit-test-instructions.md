# Unit Test Instructions: U2 u2-framework-file (US-1408)

## Setup

vitest 5.1.0, already configured in `vitest.config.mjs`; the files below run in the `main` project (node). No new dependency or configuration. Tests use real temp folders from `fs.mkdtemp(os.tmpdir())` and remove them in `afterEach`; no fixtures are committed.

## Run this Unit's tests

```bash
npx vitest run --project main tests/main/projectFile.test.js tests/main/projectService.test.js
```

Runnable before the first Red step: `projectService.test.js` exists; `projectFile.test.js` is created in Step 3.

Lint and format on the changed files:

```bash
npx eslint src/main/projectFile.js src/main/projectService.js tests/main/projectFile.test.js tests/main/projectService.test.js
npx prettier --check src/main/projectFile.js src/main/projectService.js tests/main/projectFile.test.js tests/main/projectService.test.js
```

## Expected coverage

- About 22 tests: ~18 for `projectFile.js` (read and write), 4 new detection tests.
- `src/main/projectFile.js` at 80% line coverage or more (NFR8.1), checked on its own run:

```bash
npx vitest run --project main tests/main/projectFile.test.js --coverage --coverage.include=src/main/projectFile.js --coverage.thresholds.lines=80
```

- The project-wide 80% floor is checked by Build and Test on the full suite. This Unit's runs do not judge it, and its threshold is not changed.

## Mocking and test data

- No mocks of `fs` for the read and write cases: real files, real symlinks (`fs.symlink`).
- The symlink race uses the `expect` hook seam: the test swaps the file for a symlink just before the rename, through a small wrapper, and checks `writeFailed`, the old bytes and no `.tmp` file left.
- The hostile cases are built in the test: a 70 KiB string, `'['.repeat(100000)`, a raw `{"__proto__": {"x": 1}, ...}` text, `version: 1e400`.
- `i18nKeys.test.js` keeps the sv/en keys in step; run it once after Step 6: `npx vitest run --project main tests/main/i18nKeys.test.js`.
