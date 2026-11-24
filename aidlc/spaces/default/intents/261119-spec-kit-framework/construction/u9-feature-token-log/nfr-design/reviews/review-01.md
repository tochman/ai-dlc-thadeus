## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-24T18:26:49Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/nfr-design/security-design.md > Path checks, row "Stop event transcriptPath" | The design says `insideDir(path, ~/.claude/projects)` runs "after realpath", so a link out is refused. The existing `insideDir` in `src/main/contextSize.js` only does `path.resolve` plus a prefix check. It never resolves links. `readTranscriptCalls(file, allowedDir)` calls it and does nothing more. Reusing it as named leaves NFR3.2's "symlink out" test failing. | State that U9 resolves the real path (`fs.realpath`) of both the transcript and `~/.claude/projects` before calling `insideDir`, and put that step in the Turn usage component. Or say it extends `insideDir` and that its other callers keep their current behaviour. | New |
| R-02 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/nfr-design/security-design.md > Counting once and Cursor store; logical-components.md > Cursor store, Project queue | (a) The bucket write and the cursor write are two separate steps. A crash or failure between them, with the bucket written and the cursor not, credits the same calls again on the next turn. The design only covers the other order (cursor held back after a failed bucket write). (b) The queue is one chain per project root, but the cursor is a single `userData` file keyed by project and session. Two projects finishing turns at once do a read-modify-write on the same file and can lose each other's update. That again leads to double counting. (c) Nothing prunes finished sessions, so the file grows without bound. | Choose one: a cursor file per project root, or one global queue for cursor writes. State how a duplicate after a half-done turn is avoided or accepted. For example, store the cursor position inside the bucket file in the same atomic write, or record "at most one turn double-counted" as a known ceiling. Add a rule to drop old sessions. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/nfr-design/logical-components.md > intro and Turn usage | The design says "a turn is one small local file write" and skips performance design. But `readTranscriptCalls` reads the whole transcript line by line on every Stop event. In a long session that cost is paid each turn, not once. | Note the per-turn read cost. Either start from a byte offset kept in the cursor, or record the full read as a ponytail-style ceiling with the session length at which it matters. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/nfr-design/security-design.md > Path checks, row "Feature folder" | The name pattern `^d{3}-[a-z0-9-]+$` already excludes `project` and `cursor`, so the "reserved name" check does nothing. NFR3.3 says "or similar reserved word", which leaves the intent open. A `speckit-` prefix on every key also keeps the bucket apart from the AI-DLC per-intent files. | Say in one line that the pattern is the whole check, or name the reserved words that can pass the pattern (none today). | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| traceability.json checked by hand against NFR IDs in security-requirements.md | PASS: all 10 IDs (NFR3.1-3.6, 6.1, 6.2, 8.1, 1.1) are covered and the targets exist in security-design.md | Complete. NFR6.1 is placed under "Path checks" but is a plugin/adapter requirement; the plugin side of that event is not visible in the logical components. |
| Source name check under src/ | `readTranscriptCalls`, `callsOfTranscript`, `readReadings`, `addReading`, `writeAtomic`, `resolveInRoot`, `insideDir`, `normalizeModel` exist. `costRates`, `claudeReply` and `opencodeSignal` were not matched by my search. | Most reused names resolve. Code Generation should confirm the three unmatched names (they may be exported another way). |

### Summary

The design is small, local and traces every NFR. READY, with two Major items to weigh at the gate: the symlink check relies on a `realpath` the reused `insideDir` does not do, and the cursor/bucket two-step write plus one shared cursor file can double count or lose updates across projects.
