## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-24T19:32:54Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u8-framework-switch/nfr-design/performance-design.md > NFR7.4 and logical-components.md > `applyDetection` row | `applyDetection` is described as "the code `watchForSetup` uses today" plus "close the old watcher". That code only closes `setupWatcher` and then calls `watchSpace` or `watchSpeckit`. A switch happens on a project that is already watched, so it does not hold. `watchSpeckit` returns at once when `p.speckitWatcher` exists, and `watchSpace` returns when `p.watcher` exists for the same space. Going AI-DLC to Spec Kit would leave the intents watcher (`p.watcher`) running, and the old framework's push events would continue. Going back would not restart anything that was kept. The existing `closeWatcher` closes everything, including `thadeusWatcher`, the head, config and editor watchers and the installer, so using it as is would drop watchers that do not depend on the framework. The `watchSpace` state (`p.space`, `p.questions`, profile tracker) is also not reset. | Say exactly which watchers `applyDetection` closes per direction (the old framework's only: `p.watcher` for AI-DLC; `speckitWatcher` and `featuresWatcher` for Spec Kit) and which state it clears. Say that the framework-independent watchers stay. Add a test for the AI-DLC to Spec Kit to AI-DLC round trip that counts the live watchers. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u8-framework-switch/nfr-design/performance-design.md > NFR7.5 | "A duplicate `switch` is harmless, `applyDetection` is idempotent, so no lock is added in main" holds for the file write but not for the watcher swap. `watchSpace` is async, and two calls that overlap before `p.watcher` is set can each start a watcher. The idempotence claim has to cover the watcher swap, which is the weak part. | Either serialise `applyDetection` per project (a promise chain on `p`) or narrow the claim to the file write and add a test with two overlapping calls. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u8-framework-switch/nfr-design/performance-design.md > NFR7.3 | The preview filters intents with "state is not completed or archived", written out again. `projectService.js` already exports `inProgress(intent)`, which also handles `missingOnDisk`, the `complete*` state text and done >= executed. A second filter can disagree with it. The "No cache" statement is also not exact: `loadIntentList` keeps a per-`root\|space` `listCache`, and reuses summaries when `onlyDirs` is given. | Reuse `inProgress`. Reword "No cache" to say the preview calls `loadIntentList` without `onlyDirs` and so reads a fresh list. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| None listed for this stage | Not run | Checked by reading `ipc.js` (`watchForSetup`, `closeWatcher`, `watchSpeckit`, `watchSpace`), `projectService.js` (`detectProject`, `loadIntentList`, `inProgress`) and `projectFile.js` (`writeProjectFile`). `detectProject` and `writeProjectFile` match the claims in the security design. |

### Summary

The security design is sound: input checked before any file access, one write through U2, `setupNeeded` re-checked in main, and no runner. The weak point is `applyDetection`, which is described as a plain move of `watchForSetup`, but a switch needs the old framework's watchers closed and the new ones started on an already-watched project. Fix that detail in design or at code generation; it does not block approval.
