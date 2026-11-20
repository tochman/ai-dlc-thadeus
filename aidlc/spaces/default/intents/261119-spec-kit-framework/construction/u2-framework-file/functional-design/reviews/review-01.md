## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-19T21:40:48Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u2-framework-file/functional-design/rules.md > BR1.2 (check order) and BR2.4/BR2.5 | BR1.2 tests "framework is absent" (invalid) before "version > 1" (unknownVersion). A newer app's file that renames or restructures `framework` is therefore read as `invalid`, and BR2.4 then replaces it with a fresh version 1 file. That is the downgrade BR2.5 and Q2 exist to prevent. | Check `version` first: an integer above 1 is `unknownVersion` whatever else the file holds. Apply the framework and shape checks only at version 1. | New |
| R-02 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u2-framework-file/functional-design/functional-spec.md > W1 steps 2-4 and rules.md > BR1.3, BR1.4 | The design says U2 passes "the reason" into U1's detection, but `detectProject(root, { saved, askWhenBoth })` has no reason input. It sets `reason` only when `framework === null`, and `chooseFramework` already falls back by itself when `found[saved]` is false. BR1.3 and BR1.4 need a reason on a detection that did find a framework (for example, a broken file next to a found `.specify/`). W1 step 3 also has U2 test the folder, which duplicates `found` from detection. It is not stated who composes the reason, who checks the folder, or how the reason survives the `noSpace`/`notAidlc` text. | State the interface. For example, U2 passes `saved` and a `savedProblem` reason, and U1 appends it to the reason. Drop the folder check in U2 and let detection decide from `found[saved]`. Then fix the merge order with the existing reasons, and name which Unit owns the `detectProject` change. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u2-framework-file/functional-design/rules.md > BR1.1 | `resolveInRoot` calls `realpath`, which throws ENOENT for a missing file or a missing `.thadeus/`. The write path starts in exactly that case, so BR1.1 cannot be met by calling it on the file path. | Say how the write path is confirmed. For example, create `.thadeus/` with mkdir, resolve that directory with `resolveInRoot`, then join the file name. A `.thadeus` symlink that points outside the root must give `writeFailed`. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u2-framework-file/functional-design/rules.md > BR1.2, entities.md > ProjectFile.version | An integer below 1 (0 or negative) matches no branch, so it reads as `ok`. A JSON array also counts as "an object" in many checks. BR2.3 assumes version 1. | Make `version` below 1 and arrays `invalid`. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u2-framework-file/functional-design/functional-spec.md > W2 steps 2-6 | The write reads the file, then renames, with no check in between. `writeAtomic` has an `expect` hook for this. A write from another clone or tool in that window is lost, and BR2.3 promises the other keys are kept. | Pass `expect` to `writeAtomic` that re-reads and compares the file, or record the lost-update window as an accepted `ponytail:` ceiling. | New |
| R-06 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u2-framework-file/functional-design/rules.md > BR2.1 | "Write only for a confirmed choice" cannot be enforced by a library function that takes only a framework. It rests on U4 and U8 behaving. | Name the check as the consumers' tests (U4, U8), or add a required `confirmed: true` argument. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| aidlc engine sensor-traceability (functional-design) | pass: true; gaps, orphans, missing_from_table, missing_from_upstream_ids, invalid_entries, invalid_targets all empty; findings_count 0 | Traceability is complete. The findings above are about design logic, not mapping. |

### Summary

The design is small, matches C2, and fits the existing `writeAtomic` and `readJsonSafe`. Two Major points should be settled before approval: the version check order that can overwrite a newer app's file, and the undefined hand-off of the fallback reason to `detectProject`. With two Major findings the verdict is READY, but both are cheap to fix now.
