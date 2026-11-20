## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-19T19:40:56Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/inception/contract-design/contract-summary.md > C9 `agents:progress(projectId)` | The current handler in `src/main/ipc.js` is `agents:progress(projectId, dirName)` and passes `p.space` and `dirName` to `loadAgentProgress`. C9 drops `dirName`, so the existing AI-DLC progress view cannot name the intent it wants. The C9 shape also drops the AI-DLC result, which breaks the "AI-DLC path must stay exactly as it is" rule. | Keep `dirName` as an optional second argument. State that the AI-DLC return shape is unchanged when `framework` is `aidlc`, and that `source`, `waiting` and `feature` are additive. | New |
| R-02 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/inception/contract-design/contract-summary.md > C1 mechanism and C4 | C1 is described as a push only. In code, `project:open` also returns `detection` in its response (`ipc.js` around line 770), and the existing `project:detected` push fires only when a non-AI-DLC project becomes AI-DLC (around line 344). The first-open `framework` value (null, ask) therefore reaches the renderer through the return value of `project:open`, which no contract names. Which watchers start when `framework` is null is also unstated. | Add the `project:open` return `detection` to C1 as the same Detection schema. Say when `project:detected` fires: after `chooseFramework`, after setup, and when the file changes. State what `watchSpace` and `watchForSetup` do while `framework` is null. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/inception/contract-design/contract-summary.md > C10 and C4 `next: setupAidlc` | The AI-DLC setup is named only as "US-0503". C10 and C4 hand off to it, but no channel or result shape is given. C10's `error.code` values are not enumerated. | Name the existing AI-DLC setup channel, and list the C10 error codes (for example `setupFailed`, `writeFailed`). | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/inception/contract-design/contract-summary.md > C1 `views` | `views` is "ids from the one shared view list", but the contract does not give that list or say where it is defined. U5-U7 and U10 consume it. | Name the owning module (U1) and list the Spec Kit view ids, or mark the list as an open question for U1. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/inception/contract-design/contract-summary.md > C8 | The token file name is `speckit-<feature-dir>.json`. The contract does not say how a reading is credited when the active feature changes during a session, or what happens when `active` is null. It only says "the feature active when it is read". | Say that a null `active` credits `speckit-project.json`, and what the credit key is when the feature folder is renamed or deleted. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| none listed for this stage | not run | Cross-references (C1-C10 to U1-U10) checked by hand. All resolve. Ownership is one provider per contract, and no cycle was found. |

### Summary

The contracts are complete and mapped to the Units. Two gaps against the real code should be fixed before approval: the `agents:progress` signature, and the first-open `detection` path through `project:open`. Neither is Critical.
