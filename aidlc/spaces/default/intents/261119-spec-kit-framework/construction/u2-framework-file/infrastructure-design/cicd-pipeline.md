# CI/CD Pipeline: u2-framework-file (US-1408)

Sources: `security-design.md` (tests, NFR3.x), `logical-components.md`, `functional-spec.md`, `contract-summary.md` (C2), and the team's Deployment practice.

U2 is a library module inside the desktop app. It needs no infrastructure, no new workflow job and no secret. It ships through the existing pipeline, unchanged. There is no deployment environment: the app is a desktop download.

## Stages and gates

| Stage | Where | What it checks for U2 | Gate |
|---|---|---|---|
| Unit tests | `verify` job, `npx vitest run tests/ --coverage` | `tests/main/projectFile.test.js` (new) on real temp folders, including the symlink, size, nesting, `__proto__` and no-stray-write cases (NFR3.1–NFR3.6) | Red blocks the merge |
| Coverage | same job, v8 | 80% lines over `src/**`, so `src/main/projectFile.js` is included (NFR8.1) | Below 80% blocks the merge |
| Translations | `tests/main/i18nKeys.test.js` | The new reason and error keys exist in `sv.json` and `en.json` (NFR1.1) | Red blocks the merge |
| Lint and format | ESLint, Prettier | The new module and test | A failure blocks the merge |
| Secret scan | gitleaks | The file holds only `version` and `framework` | A finding blocks the merge |
| Built-app end-to-end | Playwright on Linux CI | Unchanged; U4 and U8 add the screens that write the file | Red blocks the merge |
| Release | tag `v0.3.0` | Ships with the rest of Epic 14 | Hand check of the `.dmg`, then the tag |

The symlink tests need a POSIX filesystem. Both CI runners (macOS and Ubuntu) have one. Windows is not targeted.

## Rollback

Fix forward, as the team does for every release. A broken v0.3.0 is marked as a prerelease and the fix ships as v0.3.1. A `.thadeus/project.json` written by v0.3.0 has `version: 1`. An older app ignores the file and keeps detecting as before, so a rollback does not need to clean up files (C2).

## Secrets

None. The module reads and writes only inside the opened project.
