## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-14T16:56:50Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/functional-spec.md > W2 step 3 vs D6 step 3 and D2 "dialog opens on its own" | W2 says that when a reply for project B arrives while Dev is on project A, the dialog "opens on its own on the reply page". D6 only switches project on a click. Nothing says whether the dialog opens over project A, switches to B, or waits. The pager is per project (`agentEvents.list` takes a `projectId`), and `frontend-components.md` "Opening on arrival" only says the shell opens when `alertPlan().open` is true. A developer cannot tell what the renderer does for an event belonging to a project that is not on screen. | State the rule for an arrival that belongs to a non-active project. Either the dialog opens on that project's page and the project switches, or the dialog does not open and only the notification and strip signal it. Then rewrite W2 and the "Opening on arrival" paragraph to match. | New |
| R-02 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/functional-spec.md > D2 row "question, `questionAlerts` = `off`: no (reachable as today)" | "Reachable as today" only holds for audit events. For hook events (C3 `source: "hook"`), the hook keeps waiting up to `THADEUS_WAIT_SECONDS` (C1), and no UI entry point is named for a question whose dialog never opens. The permission row says "same", so it inherits the gap. The person could miss a waiting question, and it would only reach the agent's own prompt after the hand-back. | Name how a hook question or permission prompt is reached when `questionAlerts` is `off`. For example, add a pager indicator or reuse the strip. Or state that the hook hands back at once and the agent shows its own picker. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/functional-spec.md > D6 step 4 and frontend-components.md "Flow on a push" | A click on an event that is `queued` behind another open one opens "that page". The spec does not say whether this jumps the pager order (u1 BR2.1, u3 BR6.8) or what happens to the page currently shown. The same gap applies to reopening a dismissed reply while another page is shown (u3 BR6.14). | State that the focused page is shown at once and the others keep their order. Or say it opens when it reaches the front. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/functional-spec.md > D4 "Notifications keeps the set of event ids" | The decided-id set grows for the whole app run with no bound. Because it is already de-duplicated by the store (u3 BR6.4), the set is redundant bookkeeping. | Drop the set and rely on the store's single call per accepted event (D5). Or add a `ponytail:` note naming the ceiling. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md > C4 ownership ("U3 and U4 add members") and functional-spec.md > Contract additions | U5 adds a C4 push member and removes `questions:focus`, but the C4 consumer and owner rows do not list U5. The spec treats this as additive, which fits the contract rules, but the owning contract is not updated. | Note U5 as a C4 member adder in the contract summary, or record it as an accepted additive change. Also confirm that no renderer code still subscribes to `onQuestionFocus` once it is removed. | New |
| R-06 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/functional-spec.md > D7 "Difference from AC5.1.1" | The spec deliberately supersedes AC5.1.1 for replies. `stories.md` and the epic file are only told to change "when the story's feature docs are updated". Until then the approved story contradicts the design. | Add the `stories.md` edit to the hand-off list for Code Generation or Deployment Execution. The team's rules already require the feature docs to be updated. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| aidlc engine sensor-traceability (functional-design, u5 traceability.json) | `{"pass":true,"gaps":[],"orphans":[],"missing_from_table":[],"missing_from_upstream_ids":[],"invalid_entries":[],"invalid_targets":[],"findings_count":0}` | Traceability is clean. |

### Summary

The design is coherent. It uses one pure `alertPlan` function for all three consumers. It reuses u3's `dismissed` and `reopen` states without adding new ones. Its integration points match the passed contracts and the u3 spec (BR6.9, BR6.14, BR6.17). Two gaps should be weighed at the gate. The first is the behaviour for an event that arrives on a project that is not on screen. The second is how a hook question is reached when `questionAlerts` is `off`. Neither blocks implementation.
