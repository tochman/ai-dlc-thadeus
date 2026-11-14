## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-14T17:21:48Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/scalability-requirements.md > NFR5.23 (read with tech-stack-decisions.md D8) | The 1 MB refusal is acceptable as a limit (the script cannot cut without parsing JSON, so FR6.2's 64 KB cut holds only up to 1 MB). But NFR5.23 requires that "the strip does not change" and says nothing about an older reply of the same session. A refused over-limit Stop is not a newer event (BR6.5 is triggered only by accepted events), so an earlier reply that is still shown or dismissed stays answerable while the agent has in fact stopped with a different, unseen message. The person's typed answer would then go to the tab for the wrong question. This is the one place where the refusal can make a reply misleading rather than missing. | Add a requirement for what the refusal does to the session's open reply: either mark it stale, or show a "newer message not shown" line on it. Add a store test for an over-limit reply arriving while an older reply is shown. If the person decides to accept the risk, record it in D8 as a decision with that effect named. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/security-requirements.md > NFR3.20 | NFR3.20 defers to NFR Design how the person's own input is told apart from the renderer terminal's auto-responses. Both reach main as pty writes, and the focus reports `x1b[I` and `x1b[O` can arrive at any time. The test list names the sequences but not the failing direction: a wrongly stale reply (answer lost, text kept) or a wrongly shown one (answer typed after the tab moved on). | State the fail-safe direction in the requirement (for example, an unclassifiable write counts as the person's input), and add the DSR/CPR reply forms (`x1b[<n>;<m>R`, `x1b[?...c`) to the test inputs. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/security-requirements.md > NFR3.14 and NFR3.15 | The cleaning removes only `Cc`. Bidi overrides and other format characters (U+202A–U+202E, U+2066–U+2069, U+200B) pass through into the TUI input, and the "64 KB" limit does not say whether it is measured before or after cleaning, or in bytes or characters. | Say whether the limit is UTF-8 bytes after cleaning. Either justify keeping `Cf` characters, or strip bidi overrides, since the typed line is shown back to the person. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/performance-requirements.md > NFR4.5 | The only check that the hook "returns well within 10 s" is a script test with a 1 MB stdin. Nothing covers a slow or blocked stdin writer (Claude Code not closing stdin), where `cat` would block until the entry's `timeout 10`. The stop would be delayed for up to 10 s, which contradicts "never delays the agent". | Add a test (or a recorded fact) for stdin that stays open. State whether the 10 s timeout is the accepted ceiling, or name a shorter timeout for the Stop entry. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| aidlc engine sensor-traceability --stage nfr-requirements | `{"pass":true,"gaps":[],"orphans":[],"missing_from_table":[],"missing_from_upstream_ids":[],"invalid_entries":[],"invalid_targets":[],"findings_count":0}` | Traceability is complete. NFR5.21 and NFR3.21, referenced from other files, resolve. |

### Summary

The reply NFRs are implementable. The hook is silent and never waits, the cleaning and sanitizing rules are testable, and the typed-answer guards are in place. The 1 MB refusal is a fair, recorded known limit. The one gap worth the human's weighing is that it leaves an older reply answerable against a message the person never saw.
