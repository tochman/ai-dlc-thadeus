## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-24T15:36:49Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u5-speckit-commands/functional-design/rules.md > BR5.2 | "Any task open" gives `implement`, otherwise `converge`. A `tasks.md` that exists but has zero parsed tasks (empty or unparseable) has no open task, so the rule offers converge on a feature that was never implemented. The reader's own `flow.implement` is `work.length > 0 && every done`, so the data to tell these apart exists. | State the zero-task case in BR5.2 (for example stay on `tasks`, or offer `implement`) and add it to the test list. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u5-speckit-commands/functional-design/functional-spec.md > Edge cases ("Two agent tabs") and W3 | The button text is built in the form of "the tab's harness", but the command goes to "the last agent tab used". With two agent tabs on different harnesses (claude and opencode), the shown text and the tab that receives it can disagree. The design does not say which tab's harness `SpeckitCommandButton` reads. | Say that the harness, the busy/asking state and the target tab all come from the same tab (the last agent tab used), and that the disabled reason names it. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u5-speckit-commands/functional-design/rules.md > BR5.1 | The rule says a core stem becomes `speckit.<stem>` and an extension name is used as it is, but gives no test to tell them apart. U7's reader only checks names against a safe pattern (`speckitRules.js` SAFE_NAME), so a manifest name without the `speckit.` prefix is possible. Both Spec Kit builders (`build_command_invocation`) strip a leading `speckit.` and re-add it, which is the clear rule to copy. | Define the rule as: strip a leading `speckit.`, then build the form from the stem, as the installed tool does. Cover a prefixed and an unprefixed extension name in tests. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u5-speckit-commands/functional-design/functional-spec.md > The command form; contract-summary.md C7 | The command form was verified against the installed Spec Kit 1.4.3 and matches: Claude gives `/speckit-<stem>` with `.` replaced by `-`, opencode gives `/speckit.<stem>`. `contract-summary.md` C7 still says the epic's `/speckit-<name>` form applies to both harnesses and lists O1 as open. Codex uses a `$speckit-...` form in the same tool, and the design offers nothing there (BR5.8). | Record the resolved form in the C7 contract text so the next unit does not read the old text. Say in one line that other harnesses, codex included, are out of scope on purpose. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u5-speckit-commands/functional-design/rules.md > BR5.4 | The next command shows only for the active feature. `speckitFeatures.js` notes that with `SPECIFY_FEATURE_NO_PERSIST` set no feature is ever active, so AC3.1.1 would offer no next-command button on any feature. The design only says the view names "no feature is active". | Accept this as a known limit in the spec, or let the person pick the feature. If accepted, keep the "no feature is active" note worded so the person can see why there is no button. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| aidlc engine sensor-traceability (functional-design) | pass: true; gaps, orphans, missing_from_table, invalid_entries and invalid_targets all empty | Every story and rule reference in `traceability.json` resolves. |

### Summary

The design is implementable. The command forms match the installed Spec Kit 1.4.3 code, the call to `terminal.type('agent', text, { submit: true })` matches `TerminalContext.jsx`, and the disabled reasons reuse existing texts. The findings are small gaps in rules (zero-task case, tab and harness pairing, extension name prefix) that the developer can settle with a line in the spec.
