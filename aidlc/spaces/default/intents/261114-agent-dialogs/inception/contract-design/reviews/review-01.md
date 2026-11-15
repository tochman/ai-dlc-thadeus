## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-14T15:59:10Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md > C2 Channel sessions (guarded writeSession paragraph) and C3 AgentEvent | Typed answers go through `writeSession(id, data)`, which takes a pty id (src/main/pty.js line 76; spawnSession creates the id at spawn). AgentSession (C2, components.md) has no pty id, and openSession runs before the pty exists. Nothing says how AgentEventStore maps `sessionId` to the pty. For fallback events (`sessionId: null`) it is also unclear whether `agentEvents.answer` handles them or the renderer's `pty:write` does. The text says both that the new handlers never use `pty:write` and that today's fallback path keeps using it. | Add the session-to-pty binding to C2, for example a `bindPty(sessionId, ptyId)` call from IpcRouter at spawn, or a ptyId on AgentSession. State exactly which path answers `source: "audit"` events and what `agentEvents.answer` returns for them. | New |
| R-02 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md > C1 answer_file, C3 Answer, Open questions rows 1 and 4 | The answer contract assumes that a hook can return a question's answer. It does not define the other path, picker keys typed after a hand-back, which is the stated fallback. C1 `answer_file.content` is "the exact text the hook prints", and the key-sequence delivery shape, the `via` field and the "picker is showing" signal appear in no interface. The spike is deferred to U1 Functional Design, but U2, U3 and U4 are specified against this contract before it is settled. | Add a delivery variant to the contract (hook output vs keys), with the `via` value on the `agentEvents.answer` result. Mark C1's answer_file and the C6 command shape as provisional until the spike closes. Name which downstream contracts change if the spike answers "allow or deny only". | New |
| R-03 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md > C4 agentEvents.close vs C3 AgentEvent.state | `agentEvents.close` returns `dismissed`, which is not in the `state` enum (`queued`...`ended`), and the call lists no errors. | Add `dismissed` to the enum or change the return value. List the errors (unknown event, event not open). | New |
| R-04 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md > C1 event_file.name and answer_file.name | Event files are `<epoch-ms>-<pid>.evt`, and the answer is `<same name as the event file>.ans`. It is unclear whether that means `X.evt.ans` or `X.ans`. Two hooks with the same pid in one millisecond could also collide. | Give the answer name as an explicit pattern (`<epoch-ms>-<pid>.ans`). Add a random suffix to the event name if parallel tool calls are possible. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md > C1 kinds (`answered`) and the Contracts table | `answered` carries no correlation to the question it closes, only "the open question" of the session. The AgentEventStore to Notifications call and the new reply setting key appear in unit-of-work-dependency.md integration points but have no contract row. | Add a tool-call id, or state that at most one question is open per session. Add a short C-row for the Notifications call and the settings key, owned by U5. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| none run | n/a | No validation tools are listed for this review. I checked cross-references by hand: Unit IDs, component names and ADR references resolve against unit-of-work.md and components.md. The Unit graph is acyclic. `writeSession` exists in src/main/pty.js. |

### Summary

The contract set is coherent and the Unit ownership matches the shared artifacts. Two gaps should be weighed before approval: the missing session-to-pty binding (and the answer path for fallback events), and the answer-delivery contract that rests on an unresolved spike. Both are fixable as additions and do not force a redesign, so the advisory verdict is READY.
