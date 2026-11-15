## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-14T16:37:39Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/rules.md > BR6.6; functional-spec.md > Interfaces used and added (C2) | BR6.6 marks a reply stale on any call to the existing `pty:write` handler (src/main/ipc.js line 673, `writeSession(id, data)`). That handler carries everything the renderer's terminal emits, not only what the person types. This includes terminal-generated replies to the agent TUI's queries (colour, cursor and device-attribute reports), focus reports, and writes from other app features such as the audit-path `TerminalContext.answer()`. A TUI that goes idle and then queries the terminal would silently make a fresh reply stale, and the dialog would disable Send with "no longer waiting". The spec treats "pty:write happened" as "the person typed" with no discrimination. | Define what counts as the person's input: for example only data from keystrokes or paste, excluding terminal auto-responses, or require a printable character or Enter. Say how the signal tells the two apart (a flag on the write, or filtering in the renderer's terminal onData). Add a test case to the design for an auto-response arriving while a reply is shown. | New |
| R-02 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/rules.md > BR6.12; functional-spec.md > Typed delivery | The delivery writes the cleaned text and Enter as one `pty.write(line + ENTER)`. The "Harness facts used" table lists the Stop hook, `last_assistant_message` and opencode `session.status`, but nothing about how the Claude Code or opencode TUI treats text plus a carriage return that arrives in one chunk. Ink-style TUIs often treat a fast burst as a paste, where the trailing CR becomes a newline and does not submit. AC3.1.1 depends on this working, and BR6.12 states the typed-and-submitted result as a fact. | Record a check against both harnesses, using the u1 spike method, that one write of text plus CR submits. If it does not, change BR6.12 to write the text, then Enter as a separate write after a short delay. Keep the "checked and written in one step" guarantee for the whole sequence. Name the result in the Harness facts table. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/rules.md > BR6.14, BR6.16 | The strip shows Answer whenever LatestMessage is `waiting`. That includes a reply that is still `queued` behind a question or `shown` in the dialog. `agentEvents.reopen` is defined only for `dismissed` and refuses anything else with "event not open", so Answer can produce an error. | State what Answer does for a queued or shown reply: bring that page to the front, or disable Answer. Add the case to BR6.16 or BR6.14. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/functional-spec.md > Entity relationships (erDiagram) vs entities.md > AgentEvent relationships | entities.md says AgentEvent to LatestMessage is "1 to 0..1", meaning a reply is named by at most one LatestMessage. The ER diagram draws `LatestMessage }o--\|\| AgentEvent` (many LatestMessages to one event). The attribute-level text in entities.md ("many to 1") agrees with the diagram, not with the first line. | Make the cardinality the same in all three places. One LatestMessage per project that names one event is the intended meaning. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/rules.md > BR6.9 and functional-spec.md > Known limits | Every Stop event opens the dialog (BR6.9), so each finished turn, including a plain "Done.", interrupts the person. Only a u5 setting is promised to relax this. This is a product choice, but the design records no interim bound until u5 ships. | Record that u3 ships with replies always opening, or give a development default. Make that visible at the gate. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| sensor-traceability (functional-design, u3-replies/traceability.json) | `{"pass":true,"gaps":[],"orphans":[],"missing_from_table":[],"missing_from_upstream_ids":[],"invalid_entries":[],"invalid_targets":[],"findings_count":0}` | Traceability is clean. BR6.1–BR6.18 and the entities resolve, and no orphan or missing ID was found. |

### Summary

The design is coherent. The reply lifecycle, the LatestMessage state machine and the additive changes to C1, C3 and C4 follow the shared contracts, and the u1 rule references (BR1.1, BR2.1, BR2.4, BR2.6, BR2.7, BR3.4, BR4.1, BR4.5, BR4.6) all exist. The two Major findings are unproven assumptions the implementer would otherwise have to settle by guessing: what `pty:write` counts as the person's input, and whether a single text-plus-Enter write submits in the harness TUIs. Neither is Critical, and the verdict is READY, so the human can decide at the gate.
