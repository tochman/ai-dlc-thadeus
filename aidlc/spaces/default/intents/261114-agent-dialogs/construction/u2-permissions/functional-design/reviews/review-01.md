## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-14T16:34:53Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/entities.md > AgentEvent added_attributes `permission` ("questions is then an empty list") | u1's AgentEvent defines `questions` as required with min 1 and max 4. A permission event with an empty `questions` list breaks that constraint. The spec calls the extension additive and says it redefines nothing, so this is a hidden contradiction. A developer would not know whether to loosen u1's rule or to leave `questions` out. | Say that u2 relaxes u1's `questions` constraint to "min 1 when kind is question, absent or empty when kind is permission". Then state that u1's validation and the C3 schema accept it, or record it as a change to u1 that u1 must pick up. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/entities.md > Answer added_attributes `via` | u1 already defines `Answer.via` as `[hook, keys]`. u2 lists `via` as an "added" attribute with allowed `[hook]`. That is a redefinition, not an addition. It also drops the contract's C2 route where `keys` is used after a hand-back (`timedOut`). The spec does state the reason in W2, but C2 is not updated. | Express this as a narrowing constraint on u1's `via` (permission events only: `hook`). Note that this is a deliberate departure from C2 "Delivering an answer", so U4 and U5 do not assume `keys` for permissions. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/rules.md > BR5.3 | `permission_suggestions` in Claude Code can hold entries that are not rules, such as mode changes or directory additions. BR5.3 builds one "Allow always" choice that applies all of them, with a label that names "each rule's text verbatim". The label is undefined for a non-rule suggestion. On opencode, `always` is offered with no visible pattern at all. | Define the label for suggestion types that carry no rule text, for example by showing their type and fields. Alternatively, offer Allow always only when every suggestion has displayable text. Say what the label shows on opencode. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/functional-spec.md > state machine diagram and transition table | The table says "any: tab exits to ended". The diagram draws exit only from `queued`. `shown`, `sending` and `sent` have no exit edge. The diagram and the table disagree. | Add `shown`, `sending`, `sent` and `timedOut` to `ended` on tab exit in the diagram, or draw one "any state" edge. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/functional-spec.md > Open points for Code Generation (Deny with `interrupt: true`, opencode field names) | Two behaviours that the rules treat as fixed depend on checks not yet done: Claude Code's deny with `interrupt`, and the opencode `permission.asked` field names. BR5.1 and BR5.2 define `what` and `detail` for opencode without knowing these names. Both are flagged honestly, so this is a risk and not an error. | Keep both as gates before Code Generation writes the adapter. Record the fixture capture as the first TDD step, so the opencode mapping is tested against recorded payloads. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| aidlc engine sensor-traceability (functional-design, u2-permissions traceability.json) | `{"pass":true,"gaps":[],"orphans":[],"missing_from_table":[],"missing_from_upstream_ids":[],"invalid_entries":[],"invalid_targets":[],"findings_count":0}` | Traceability is clean: no gaps, orphans or invalid targets. |

### Summary

The design is implementable. Permission-prompt handling is safe by construction: the app never decides (BR5.6), answers go only through the waiting hook (BR5.8), and a timed-out permission is never sent as keys (W2). It also reuses the u1 rules by name. The main gap is a conflict with u1's `questions` min-1 constraint (one Major, within the READY limit), plus a few Minor consistency and label-definition items.
