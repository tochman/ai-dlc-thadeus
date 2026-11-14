## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-14T17:19:04Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/security-requirements.md > NFR3.17 (read with rules.md BR5.3) | "Allow always" is bound to what the person saw only for Claude Code. For opencode, BR5.3 offers Allow always as decision `always` with no label naming what opencode will remember, and NFR3.17 says nothing about it. The opencode request can carry its own patterns to persist, and the person never sees them. This contradicts the focus requirement that "allow always" writes only what was picked and seen. The field names are also unknown until the fixtures are recorded. | Add an opencode clause to NFR3.17. The Allow always label must show the request's own always-patterns, taken from the recorded fixture. If the request has none or they cannot be read, do not offer Allow always. Add an adapter test for it. | New |
| R-02 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/security-requirements.md > NFR3.16 and NFR3.17 | The sanitising and the 64 KB cap apply to `detail` (and `what`) only. The Allow always label embeds each suggestion's rule text "verbatim", and that text is not covered by the escape rule or by any size cap. The disable-on-truncate rule covers `detail` only. Control characters or bidi characters in rule text would render unescaped. A very long or cut rule list would hide part of what Allow always applies. | Apply the NFR3.16 escaping to the label and every other agent-supplied string: rule text, `cwd` and the tool name. Cap the label total. If the rules do not fit whole, disable Allow always, as is done for a cut `detail`. Add tests at the bounds. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/security-requirements.md > NFR3.16 | The list of characters shown as escapes misses invisible and reordering characters: U+061C, U+2060–U+2064, U+FEFF, U+2028/2029, U+00AD and the tag block U+E0000–U+E007F. Text in these can be hidden in a command shown in the dialog. | Widen the class to all Unicode format (Cf) characters plus line and paragraph separators, with a test per range. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/security-requirements.md > NFR3.14 with performance-requirements.md NFR6.4 and NFR6.5 | Nothing is preselected and Enter alone sends nothing, which is good. Nothing states whether the dialog takes OS keyboard focus when a permission arrives. If it does, keys the person is typing into the terminal (for example a number key followed by Enter) can land on the new page and send a choice. Nothing requires a short input-ignore period after the page shows. | State whether the window takes OS focus on arrival. Add a brief guard that ignores key and click input right after a permission page shows, with a test. Or record that the two-step number-then-Enter send is the accepted mitigation. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/reliability-requirements.md > NFR5.16 and NFR3.15 ("hook no longer waiting") | Both rely on the store knowing whether the hook printed the answer file or is still waiting, but no signal is named for this. Without one, "hook no longer waiting" is a race. The result is safe (no decision is made), but the state may wrongly say "sent". | Name the mechanism, for example the script removes the `.ans` after printing it and the store checks for that, or record that it is decided in NFR Design. | New |
| R-06 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/reliability-requirements.md > NFR5.19 | The target "at most once per `requestID`" cannot be fully held by the plugin. A terminal answer arriving between the `permission.replied` check and the `reply` call is a race that the tests (replied first, reply rejecting) do not cover. | Say that the residual window is accepted and that opencode takes the first decision. Add a test for a replied-during-reply case. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| aidlc engine sensor-traceability --stage nfr-requirements | pass: true, 0 gaps, 0 orphans, 0 invalid entries | Traceability is complete. |

### Summary

The core promises hold: no automatic answers on any path, answers bound to a waiting shown event of a live session and accepted once, and a hand-back by empty answer file. The two Major gaps are both about what "allow always" really applies: the opencode path shows nothing about what is remembered, and the agent-supplied rule text in the label is not sanitised or capped. Fix both before Code Generation. Everything else is minor.
