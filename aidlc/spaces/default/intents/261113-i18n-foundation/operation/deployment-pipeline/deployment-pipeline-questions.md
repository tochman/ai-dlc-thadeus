# Deployment Pipeline Questions: US-0701 i18n foundation and English

Sources: `.github/workflows/release.yml` and the person's words when the plan was set (message f9aa1cf7): "the deployment steps (create a PR and push, merge) I wnat to keep this siple and ultra fast".

## Q1. [Release engineer] Does the pipeline need to change for this work?

The PR job already runs `npm ci`, `npx vitest run tests/` and the macOS and Linux builds. The new dependencies are in `package-lock.json`, and the language files are bundled by electron-vite.

A. No. The existing workflow covers the new dependencies, tests and bundled JSON as it is
B. Yes. Add a separate i18n key-check job
X. Other (please specify)

[Answer]: A. The key checks run inside the existing `npx vitest run tests/` step. **Mode:** inferred from the workflow; no change was asked for.

## Q2. [Product owner] What does delivery mean for this story?

A. Push the branch, open a PR, and merge it once CI is green; no version tag
B. Also tag a release (v0.3.0) after the merge
X. Other (please specify)

[Answer]: A. "create a PR and push, merge" (message f9aa1cf7). The epic also says this story is not part of v0.2.0, and no release was asked for.
