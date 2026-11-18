# Unit Test Instructions: v0.2.9 release

- **Framework:** vitest 5.1.0, project `main` (node). No new configuration is needed.
- **Run this work's tests:** `npx vitest run tests/main/releaseVersion.test.js`
- **Also affected:** `npx vitest run tests/main/featureDocsStatus.test.js tests/main/releasesPlan.test.js`
- **Tests:** 5, in `tests/main/releaseVersion.test.js`:
  - the release plan file exists
  - its title matches the version
  - every slice row is ✅
  - the rename note is present for 0.2.9
  - the lock file's version matches `package.json`
- **Test data:** the real repository files (`package.json`, `package-lock.json`, `docs/releases/`). Nothing is mocked.
- **Coverage:** the project floor is 80% lines. Build and Test checks it on the full suite. This change adds no source code.
