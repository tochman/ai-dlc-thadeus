## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-24T11:52:54Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u4-framework-choice/functional-design/functional-spec.md > Workflow: first open, step 4 ("the C1 push switches the views"); Main-side modules | Nothing in the design owns the push after `chooseFramework` writes the file. In `src/main/ipc.js`, `watchForSetup` pushes `project:detected` only from the watcher's `onFound`. That callback returns early when `detection.framework === null`, and `watchForAidlc` sets `found = true` and never fires again. Under U4 a project with folders but no file detects as `ask` (null), so the one-shot watcher is spent without a push. Nothing then closes `p.setupWatcher`, sets `p.framework`, or starts `watchSpace` or `watchSpeckit`. After a successful write the views would not switch, and the AI-DLC space watcher or Spec Kit watcher would never start. | Add to the `chooseFramework` handler in `ipc.js`: after a successful write, re-run `detectProject`, close the setup watcher, set `p.framework`, start the space or Spec Kit watcher, and send `project:detected`. Add a test for it. Say that the C1 push comes from this handler and not from the watcher. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u4-framework-choice/functional-design/frontend-components.md > `SetupAidlc.jsx`, `SetupSpeckit.jsx` row | The row says their `onApplied` "triggers the save", but `ProjectView`'s `setupProps.onApplied` already does work. It sets `justSetUp` and records the harness (U3 passes the same prop to `SetupSpeckit`). The design does not say whether `FrameworkChoice` wraps that callback, replaces it, or skips it. A replacement would lose the "set up" confirmation panel and the harness choice. | State that `FrameworkChoice`'s handler calls `setupProps.onApplied` and then `chooseFramework`. Add a renderer test that `justSetUp` still shows after the save. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u4-framework-choice/functional-design/rules.md > BR4.1 | The screen is reached only when the file is `missing`. An invalid or unreadable file with both frameworks found falls back to detection with `askWhenBoth` off, which picks AI-DLC silently. The only hint is U2's reason text, and there is no way to choose Spec Kit short of editing the file by hand. | Record this as an accepted limit, or add a "choose again" way in for a broken file. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u4-framework-choice/functional-design/functional-spec.md > Contract C4, with Q2's change | `chooseFramework` returns `next: none` with `file` set, and `next: setup*` with `file: null`, so the two fields carry the same signal. The spec also does not say what the screen does when a "found" write fails at the file-system level. The state diagram does cover that, as Saving back to Choosing. | Say that `file` is the only success signal, or drop one field. Name the error shown on a failed write. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Manual traceability check | PASS | AC2.2.1 to BR4.1 and BR4.2; AC2.2.2 to BR4.3 to BR4.6; AC2.2.3 to BR4.6 and BR4.7; BR4.8 as a reverse N/A. Every target exists in `rules.md`. |
| Code check (`projectService.js`, `ipc.js`, `watcher.js`, `ProjectView.jsx` on `main`, plus `ProjectView.jsx` and `SetupSpeckit.jsx` on `feat/US-1405`) | The `askWhenBoth` hook exists. The post-write push path does not. | Basis for the Major finding and the first Minor. |

### Summary

The design is sound and traceable: rules, state machine and tests fit the code. One Major gap remains, the missing owner of the post-write re-detect and push. With one Major and no Critical the verdict is READY, but fix that gap in the design before the code is written.
