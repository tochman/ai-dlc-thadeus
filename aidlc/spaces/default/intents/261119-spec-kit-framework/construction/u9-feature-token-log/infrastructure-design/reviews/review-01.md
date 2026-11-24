## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-24T18:30:59Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/infrastructure-design/cicd-pipeline.md > Stages and gates, "Packaging" row; traceability.json > coverage NFR3.5 | The Packaging row says the `release/v0.3.0` PR checks that the cursor store path from `app.getPath('userData')` works in the packaged app, and that this blocks the release merge. In `release.yml`, `build-mac` and `build-linux` only build and run the existing Playwright suite, and the `build-linux` glibc check only inspects native binaries. The cicd-pipeline.md's own Built-app e2e row says U9 has no view to test. Nothing exercises the cursor path in a packaged build, so this gate does not exist. NFR3.5 is also about the cursor holding no message text, which is a unit-test property and not a packaging property. Traceability maps NFR3.5 to the packaging check, so it shows OK with no real check behind it. | Either name a concrete check (a unit test with a mocked `userData` path, or a packaged-app smoke step added to the release PR) or drop the claim and mark the packaging row "manual `.dmg` check only". Re-map NFR3.5 in traceability.json to the unit test that asserts the cursor file has no text fields. | New |
| R-02 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/infrastructure-design/cicd-pipeline.md > Rollout and rollback | The text says a bad cursor file is "harmless to delete" because the next turn counts from first sight again (NFR3.6). The functional spec says the cursor tracks which calls were already counted, and NFR3.6 sends every call already in the session at first sight to `speckit-project`. After a deletion, the whole session history is therefore credited to `speckit-project` a second time, on top of what was already logged to the feature and project buckets. That double-counts tokens in the log. The same happens when the user-data folder is cleared or the app is reinstalled, so it is a data-integrity risk. | Correct the claim to say deletion causes a one-time double credit of the session's earlier calls. Then either accept that and record it, or require the first-seen baseline to be skipped when a bucket already holds ids for that session. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/infrastructure-design/cicd-pipeline.md > Stages and gates, "Unit tests + coverage" row; traceability.json > NFR8.1 | The row promises "80% line coverage per module and plugin". `vitest.config.mjs` sets only the global 80% threshold and lists per-file thresholds for specific agent and dialog files. The new U9 module and `.opencode/plugins/thadeus-dialog.js` have no per-file entry, so the pipeline would not fail if either one dropped below 80% while the total stayed above it. | Add per-file `lines: 80` entries for the new module and the plugin to `vitest.config.mjs` as part of this Unit, and say so in the pipeline doc. Otherwise reword the row to "global 80% floor". | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/infrastructure-design/traceability.json > NFR1.1 | NFR1.1 is marked N/A. Its measure is `i18nKeys.test.js` staying unchanged, and that test runs in the `verify` job, so the requirement does have a CI gate. | Map NFR1.1 to the `verify` job's `i18nKeys.test.js` instead of N/A. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Manual check of traceability.json against NFR IDs in nfr-requirements/security-requirements.md | The file's `upstream_ids` list NFR1.1, NFR3.1–3.6, NFR6.1–6.2 and NFR8.1, which matches every NFR ID in the table, with no missing or extra IDs and no duplicates. Two mappings are wrong (NFR3.5 target, NFR1.1 N/A), as the findings above explain. | The IDs are complete, but two mappings overstate or understate the coverage. |
| Check of `release.yml` against the claimed gates | `verify` runs gitleaks, vitest with coverage, ESLint, Prettier and e2e, as claimed. The `build-mac` and `build-linux` jobs run on `release/*` PRs and on tags, as claimed. No U9-specific packaging step exists. | The verify-job claims hold. The packaging claim does not. |

### Summary

The Unit adds no infrastructure and correctly reuses the existing pipeline, and the verify-job gates are real. Two claims need correcting before approval, though neither blocks it. One is the packaging check for the cursor path, which no job runs. The other is the "harmless to delete" cursor claim, which would double-count tokens after a deletion.
