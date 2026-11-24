## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-24T10:57:32Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u10-speckit-agent-status/functional-design/rules.md > BR10.2 (waiting = { question, agent }) | BR10.2 reads "its header, else the first line of its body" and "the agent's name, else the harness label" as if the event carried them. The public event the store returns (`PUBLIC` in `src/main/agentEvents.js`) has no top-level header, body or agent name. A question event holds a `questions` array, each entry with its own header and text. A permission event holds a `permission` object and no questions. `agentId` is main-only and is an id, not a name. So the developer must guess three things: which question of several supplies the text, where a permission's text comes from, and where an agent name could come from at all. The last has no source, so `agent` is always the harness label. AC5.2.1 asks for "the agent's name". | Say in BR10.2 which fields are read: the first entry of `questions` (its header, else the first line of its text) and the `permission` field that holds the tool or request text. State that no agent-name field exists, so `agent` is the harness label (`selectableHarness(ev.harness).label`). Record that as the intended meaning of "the agent's name" in AC5.2.1. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u10-speckit-agent-status/functional-design/rules.md > BR10.2 "open" and "oldest first"; functional-spec.md > Assumptions | "Open" is not defined by state. The store uses states such as `shown`, `timedOut`, `sent` and `ended`, and the popup has its own `OPEN` set. The Assumptions section orders by "the popup's pager order (questions and permissions before replies)", while BR10.2 says "oldest first". Those are two different orders. | Define "open" by the popup's `OPEN` state set (or list the states). Order by `arrivedAtMs`/`seq` only, and drop the pager-order assumption or reconcile it with BR10.2. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u10-speckit-agent-status/functional-design/frontend-components.md > Component table, row 2 | The mount point is left open ("`SpeckitShell.jsx` or `SpeckitFeatures.jsx`"). The functional spec says the Specs view mounts the readout above the features list. | Name one file, so the integration test knows where to look. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u10-speckit-agent-status/functional-design/functional-spec.md > Contract C9 and BR10.4; src/main/ipc.js `agents:progress` | The handler today calls `loadAgentProgress(p.root, p.space, dirName)`. The new branch needs the hook event store (`agentStore.list(projectId)`, which is the module-level variable in `ipc.js`) and the project's framework value. Neither is named as an input, and the store may be null. When it is null, the spec says nothing about whether `waiting` is null. | State that the handler passes `agentStore?.list(projectId) ?? []` and the project's framework to `loadSpeckitProgress`, and that a missing store gives `waiting: null`. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| traceability.json against stories.md | AC5.2.1, AC5.2.2 and AC5.2.3 are all covered. BR10.1 to BR10.7 each appear as a target. BR10.8 is listed as N/A. | Consistent. I did not run a validator, only compared the files by hand. |
| Spot-check of `src/main/ipc.js`, `src/main/agentEvents.js` and `src/renderer/AgentDialog.jsx` | The `agents:progress` handler, the `list(projectId)` export and the `agent-events:changed` push exist as the design assumes. The event field gaps are in the Major finding. | The integration points resolve. The event field shape does not match BR10.2's wording. |

### Summary

The design is small, read-only and traces cleanly to AC5.2.x. The one gap worth settling before approval is that BR10.2 describes event fields (header, body, agent name) that the public hook event does not carry in that form. The rest are minor clarifications.
