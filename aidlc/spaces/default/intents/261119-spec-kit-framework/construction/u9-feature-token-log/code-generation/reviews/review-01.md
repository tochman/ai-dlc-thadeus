## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-24T18:59:27Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | src/main/speckitTokens.js > credit() bucket write loop | At first sight of a session, `earlier` goes to `speckit-project` and `turn` to the active feature, as two writes. If the first write succeeds and the second fails, the function returns without moving the cursor. The next turn then credits `earlier` to `speckit-project` a second time. BR3.2 says a failed write must not credit twice, and the file's `ponytail:` notes list only the crash case. | Either record this case in the `ponytail:` note, or write both buckets and move the cursor per bucket (for example, keep a per-bucket "credited" marker in the session entry). | New |
| R-02 | Minor | src/main/speckitTokens.js > opencodeUsage() | When an opencode session's running totals go down (a session reset or compaction), the increase is clamped to 0 but the lower total is stored as the new cursor. The next event then re-credits everything above that lower mark. This is a double count, and the opencode event shape is still provisional (K12). | Store `max(total, prev.total)` per kind, or note the ceiling in a `ponytail:` comment, and add one test for a decreasing total. | New |
| R-03 | Minor | src/main/speckitTokens.js > createSpeckitTokens() `queues` map | A promise for each project root stays in `queues` for the life of the app. The cost is one settled promise per root, so the impact is small. | Delete the entry when its run is still the last queued one, or accept it with a `ponytail:` note. | New |
| R-04 | Minor | src/main/speckitTokens.js > cleanSession() and claudeUsage() | The cursor keeps counts for every message id of a session, and only whole sessions are pruned (after 30 days). A very long session makes a large cursor file that is rewritten on every Stop. | Note the ceiling in a `ponytail:` comment, or keep only the ids the transcript still has. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| npx vitest run --project main (5 named files) | PASS: 5 files, 103 tests passed, 573 ms | Matches the code summary's claim of 103 tests. I did not re-measure the 96.73% coverage figure. The full suite and the project-wide floor are left to Build and Test, as the summary says. |

### Summary

The design holds. The cursor is advanced only after the bucket write, so BR3.2 is met for the main path. `.thadeus` is created one level at a time, so a symlinked `.thadeus` cannot cause a folder to be created outside the project. Only Spec Kit projects reach the logger (BR1.1), and turns for one project run one at a time. The ipc.js, agentAdapters.js and tokenReadings.js changes are small and confined to this Unit. The four findings are edge-case double counts or small leaks. They are worth a `ponytail:` note or a small fix, and none of them blocks.
