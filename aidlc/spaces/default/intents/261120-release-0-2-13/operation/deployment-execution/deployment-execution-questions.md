# Deployment Execution Questions: v0.2.13

Pre-deployment checks: suite, coverage, ESLint and Prettier green (`test-results.md`, run 2). No migrations, no services, no AWS. The four committed story branches are not pushed yet; US-0609 is uncommitted on `feat/US-0609`.

## Q1. Commit US-0609

US-0609's own changes: the `src/` and `tests/` files, `src/main/thadeusSync.js`, `tests/main/thadeusSync.test.js`, `docs/FEATURES.md` and `docs/features/epic-06-feature-docs.md`. Also uncommitted, not US-0609's: the codekb files, `memory/team.md`, `memory/project.md`, `intents.json`, the linux-update-hotfix audit, the spec-kit and release intent records, and two token logs.

A. Commit US-0609's own changes on `feat/US-0609`; leave the rest for the intent-close commit on `main`
B. Commit US-0609's changes and the rest on `feat/US-0609`
C. Don't commit yet
X. Other (please specify)

[Answer]: B

## Q2. Open the story pull requests

A. Push the five story branches and open their pull requests now; merge each in build order once CI is green, merging `main` in and rerunning the suite between them
B. Push and open the pull requests, but I merge them myself
C. Not now
X. Other (please specify)

[Answer]: A
