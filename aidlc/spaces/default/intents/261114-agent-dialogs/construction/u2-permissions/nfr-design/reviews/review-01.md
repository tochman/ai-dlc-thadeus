## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-14T18:14:03Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-design/security-design.md > SD9 "One function for the intent", SD14 | SD9 says u1's question header and option labels call `visibleText` and that it is the only escaping code in the intent. u1's reviewed security-design.md and logical-components.md (the shared base) contain no escaping of plain-text agent strings at all (a search for visibleText, control characters, bidi and escape finds nothing). The function is also placed in u2's LC3 work. SD14, the list of u1 fixes u2 relies on, does not list it. u1 is built first, so u1 would ship question labels shown raw, and the "one function" claim would be false until a later Unit patches u1. | Either list the `visibleText` adoption in SD14 and in the "Prerequisites in u1" paragraph of logical-components.md, so u1's Code Generation applies it to header and option labels, or state that u2 retrofits u1's fields and name the u1 files and tests that change. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-design/security-design.md > SD9 code block | The illustrative `HIDDEN` regex literal contains raw U+2028 and U+2029 characters (the file has them as literal bytes, not ` ` ` `). A raw line terminator inside a JS regex literal is a SyntaxError. A developer who copies the sanitizer verbatim gets a parse failure, or, if the characters are lost in an editor, a class that silently misses LS and PS. | Write `  ` as escapes in the class. Add the U+2028 and U+2029 adapter tests the tested-by list already names, and make them read the characters from escapes too. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-design/performance-design.md > PD8 input guard | The guard is specified as swallowing `keydown`, `pointerdown` and `click` "on its choices", yet it claims to cover Esc and number keys while focus is on the title. The existing `QuestionPopup.jsx` closes through the native `<dialog>` `onCancel`, which a choice-level handler never sees. The guard clock starts when the page is shown. If the window is in the background (SD8 forbids taking focus), it has expired long before the person returns. | Put the guard at dialog level, including `onCancel` (preventDefault while guarded). Say whether the 500 ms also restarts when the window gains focus. The page is never answered by stray input either way, so the effect is limited to Esc and in-flight input after a return. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-design/reliability-design.md > RD10 and RD12 (Close/Esc) | `handBack` writes an empty `.ans` by atomic rename. The design does not say what Close, Esc or the store's time-out timer do while the event is `sending` (opencode's window is up to 5 s). An empty `.ans` can replace the person's real answer before the hook takes it, or follow one the plugin has already replied to, and the toast then says "handed back" when a decision was applied. Nothing is allowed without the person, but the page can state something untrue. | State the rule: Close, Esc and the timer during `sending` either wait for RD10's outcome or are ignored. Add a store test for Close during `sending`. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-design/security-design.md > SD11 opencode (Q1 A) | Q1 A is implemented as answered (shown with the request's own patterns, otherwise not offered), but the field name `always` is "expected" and not yet seen in a recorded fixture. The failure direction is safe (no Allow always). SD11's rule shape also leaves open whether an empty `toolName` or an empty pattern string counts as a valid string, and whether the 256 and 1 024 caps count code points or UTF-16 units. | Name the recorded fixture as a gate before adapter code. Require non-empty strings for `toolName` and directories. State the unit for the caps (code points, as for `what`). | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| aidlc engine sensor-traceability --stage nfr-design | pass: true, no gaps, orphans, missing rows or invalid entries | NFR1.12, NFR3.20, NFR3.21 and NFR8.6 are not a gap. observability-design.md (lines 19, 36, 56, 64) and RD13 carry them in "Satisfies" with tests. |

### Summary

No path lets the app answer a permission: `sendPermission` is the only writer of a non-empty answer, and `handBack` takes no text. A timed-out, ended or stale permission is refused, keys are unreachable for permissions, and Allow always is offered only for shapes the label shows whole. The weak points are that the shared sanitizer is not backed by u1's design, a broken regex literal in the code sample, an under-specified input guard, and the unspecified Close behaviour during `sending`. None of these blocks building from the document.
