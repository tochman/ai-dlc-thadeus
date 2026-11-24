## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-24T17:00:35Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u5-speckit-commands/nfr-design/performance-design.md > NFR7.2 and NFR7.4 | The design says the button state follows "the agent tab", but `TerminalContext.jsx` offers only aggregate checks across all agent tabs (`anyBusy`, `asking`, `busyAgents`) and per-tab `states`. `type('agent', ...)` goes to the last agent tab, and the harness comes from `lastHarness`. With two agent tabs (the spec allows this), the harness, the idle check and the target can come from different tabs, so a command can be typed into a busy tab or in the wrong harness form. The `sending` guard is also per button, so two different buttons clicked quickly each type a command, although NFR7.4 says one click types one command and a second click types nothing more. | State which tab the buttons use (the last agent tab that `type('agent')` resolves to) and read harness, state and asking for that tab only. Add a test with two agent tabs. Make the `sending` guard shared by all buttons in the view, or disable every button while any send is in flight. | New |
| R-02 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u5-speckit-commands/nfr-design/security-design.md > NFR4.2 (name mapping) | The mapping is ambiguous for extension commands. It says claude gets `/speckit-<stem with . as ->` and opencode gets `/speckit.<stem>`, and a valid name is `speckit.git.commit`. Taken literally the stem is the whole name, giving `/speckit-speckit-git-commit` and `/speckit.speckit.git.commit`. The functional spec says `speckit.git.commit` must become `/speckit-git-commit` for claude. The tests only assert "gives a command", so a wrong form would pass. | Define the stem as the name without the `speckit.` prefix. Put the exact expected strings for both harnesses in the NFR4.2 tests, for a core stem (`plan`) and an extension (`speckit.git.commit`). | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u5-speckit-commands/nfr-design/security-design.md > NFR4.4 | The existing code types `/speckit-constitution ` with `submit: false` (`SpeckitRules.jsx` line 128), so the person presses Enter. U5 now always sends Enter. `TerminalContext.type` writes straight to the pty, and the design does not cover text the person has half-typed in the agent prompt (`terminal.pending`), which the command would be appended to and submitted. | Say how a pending draft is handled: disable with a reason while `terminal.pending('agent')` is true, or record that the append is accepted. Add a test for whichever is chosen. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u5-speckit-commands/nfr-design/security-design.md > NFR4.2 regex | `^speckit(.[a-z0-9_-]+)+$` accepts segments that start with `-` (for example `speckit.--help`), which would be typed as an option-like token. There is no length cap on the name. | Require each segment to start with a letter or digit, and cap the name length, in `speckitCommand` and in the NFR4.2 tests. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u5-speckit-commands/nfr-design/traceability.json > upstream_ids | `logical-components.md` assigns NFR1.1, NFR2.1, NFR8.1, NFR8.2 and NFR8.3 to components, but `traceability.json` lists only the NFR3 to NFR7 ids. Those five are carried without any design row. | Add rows for them (or note that an earlier stage covers them), or drop them from the component table. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| none listed for this stage | not run | Cross-references were checked by hand against `TerminalContext.jsx`, `SpeckitFeatures.jsx` and `SpeckitRules.jsx`. |

### Summary

The design is small and the security boundary is sound: single-line text, a validated name, a click-only send, and no fs or IPC use. Two Majors remain, which is within the READY limit: the target-tab and double-send behaviour with several agent tabs, and the ambiguous extension command mapping. Both are cheap to fix before Code Generation.
