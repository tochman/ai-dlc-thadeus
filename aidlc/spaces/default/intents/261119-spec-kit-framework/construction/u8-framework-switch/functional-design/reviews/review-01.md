## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-24T19:21:43Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u8-framework-switch/functional-design/functional-spec.md > Workflow W1 step 5; rules.md > BR8.6 | The design says `project:switch` "sends the C1 detection push". In `src/main/ipc.js` the push alone only updates the window. The main process also keeps the project's `p.framework` and its watchers (`watchSpace` for AI-DLC, `watchSpeckit` for Spec Kit), and `watchForSetup` sets them only when the project had no framework. A switch from a project that already has a framework never reaches that code. Left unspecified, the old framework's watcher keeps running, the new one never starts, and live updates of the new views stay stale. | State in W1/BR8.6 what `project:switch` does in the main process. It should update `p.framework`, close the old framework's watcher, start the new one, then send the push. Name the helper it reuses, or say that the detection code is shared. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u8-framework-switch/functional-design/functional-spec.md > W1 step 4 | The Spec Kit branch is described as "`speckit:setup` with the project's harness". In `ipc.js`, `speckit:setup` only runs after `speckit:setupPreview` has stored `p.speckitSetupInfo` for the same harness, and `setup:run` needs a prior `setup:info`. The design does not say the switch flow makes those preview calls. | Add the preview call (`speckit:setupPreview` or `setup:info`) before the setup call to step 4. Also say whether the setup can be cancelled, since the `setup` state lists "cancel" as an exit. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u8-framework-switch/functional-design/rules.md > BR8.1, BR8.5 | The error shapes disagree. BR8.1 says "error naming the framework" and U4's `chooseFramework` throws. BR8.5 and C10 return `{ ok: false, error: { code, message } }`. The code list covers only `setupNeeded \| writeFailed`, so an invalid `to` has no code. | Add `invalidFramework` to the C10 error codes (or state that it throws). Say where "the current framework" in BR8.1 comes from, and what happens when it is `null` (the person must still choose). | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u8-framework-switch/functional-design/rules.md > BR8.3 | "State is not completed or archived" for an AI-DLC intent has no named source, such as the intents read and the state values it checks. The `inProgress` list drives AC2.3.2, and without a source the code generator has to guess. | Name the existing read that returns intent state, and the exact state values that count as in progress. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Manual check of traceability.json against AC2.3.1 to AC2.3.4 in stories.md | PASS | Each of the four AC ids maps to existing rules. BR8.1 to BR8.6 all appear in rules.md. |
| Cross-check of C10 and C4 against the contract summary and `chooseFramework` on feat/US-1406 | PASS | The `project:switchPreview` and `project:switch` shapes match C10. The folder re-check and the `writeProjectFile` call follow the same pattern as `chooseFramework`. |

### Summary

The flow is traceable end to end and all four acceptance criteria are covered, with the write kept atomic and the setup run first. The main gap is the main-process side of the switch: `p.framework` and the watchers must change along with the detection push. The other findings are minor clarifications.
