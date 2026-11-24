## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-24T18:20:16Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/nfr-requirements/security-requirements.md > NFR3.2 | NFR3.2 names `insideDir` as the guard and lists "symlink out" as a test. `insideDir` in `src/main/contextSize.js` only compares resolved path strings. It never follows links, so a link inside `~/.claude/projects` that points elsewhere passes, and the required test would fail against the named mechanism. | Add a realpath check of the transcript before reading (or drop the symlink case and state the accepted limit). Keep the "symlink out" test only if the guard can pass it. | New |
| R-02 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/nfr-requirements/security-requirements.md > NFR3.5, NFR3.6 (cursor) | Nothing says what happens when the cursor file is missing, corrupt or pruned. By BR1.2 and Q1 the first event then counts the whole session again, so calls already logged are added a second time (to `speckit-project`). BR3.2 only gives at-least-once on a failed write. No size bound or cleanup for the cursor store either. | Add a requirement: a corrupt or missing cursor is treated explicitly. Either rebuild from the bucket or accept and record double-counting as a known ceiling. Also state a cursor atomic-write rule and a bound or prune policy. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/nfr-requirements/security-requirements.md > NFR6.1, NFR6.2 | The opencode usage payload is untrusted input at a boundary. There is no rule that counts must be finite, non-negative integers. A NaN or a count lower than the stored one would be written into a cumulative total on disk. "Increase only" is not enforced. | Add a validation requirement and a test: non-numeric or negative counts are ignored, and a lower count never reduces the stored usage. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/nfr-requirements/security-requirements.md > NFR3.4 | The reused `recordReading` calls `fs.mkdir` on `.thadeus/tokens` before `resolveInRoot`. With a symlinked `.thadeus` the directory is created outside the project before the write is refused. The write is refused, but the stray directory is not. | Require the new add function to resolve first and create after, with a test that nothing appears outside the root. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/nfr-requirements/security-requirements.md > NFR3.3 | "A reserved word such as `project`, `cursor` or similar" is open-ended. A feature folder named `project` already maps to `speckit-project`. The rest of the list is not defined, so the test cannot be written exactly. | Name the exact reserved set, or state that only the `project` name collides and drop "cursor or similar". | New |
| R-06 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/nfr-requirements/security-requirements.md > NFR3.2 and missing NFR | The transcript guard accepts any file under `~/.claude/projects`, including another project's transcript. There is also no bound on transcript size or read time, though the whole file is parsed on every Stop event in the main process. | Note the accepted scope, or restrict to the project's own folder. Add a size or time ceiling, or record it as a `ponytail:` ceiling. | New |
| R-07 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/nfr-requirements/tech-stack-decisions.md > Bucket file, Cursor store | The `.thadeus/tokens/speckit-*.json` files are committed and merged by `thadeusSync` as reading lists. The artifact does not say whether merging cumulative per-machine totals from two clones is valid. The one-promise-queue-per-project design also covers only a single process. | State the multi-clone behaviour (accepted, or last write wins), and say that the queue covers one app process. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| none required | Not run | The stage lists none. Facts were spot-checked by reading `src/main/contextSize.js` and `src/main/tokenReadings.js`. |

### Summary

The security requirements are focused and traceable, and they reuse the existing guards. Two Major gaps should be weighed before approval: the symlink test in NFR3.2 cannot pass with `insideDir` as written, and the cursor-loss case leads to double-counting. Both can be settled in this artifact or accepted as known limits.
