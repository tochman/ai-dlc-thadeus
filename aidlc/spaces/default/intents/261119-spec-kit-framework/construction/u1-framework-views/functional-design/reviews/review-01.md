## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-19T19:54:36Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u1-framework-views/functional-design/functional-spec.md > BR1.5, BR1.6; frontend-components.md > App.jsx and ProjectView.jsx rows | Today both `App.jsx` (line 402) and `ProjectView.jsx` (line 361) fall back to the literal view `'intents'` when the chosen view is not offered. `'intents'` is not a key in the views table, and it is the AI-DLC intents list. For `speckit` and `null` the spec never says which view is the default or the fallback, so a Spec Kit project can still land on the intents view. The table also lists `features` for speckit without saying whether it still depends on `showFeatures`, which `App.jsx` line 401 uses today. | Add a per-framework default view to the table (`specs` for speckit, setup for null) and use it as the fallback in both components. State whether `features` is still gated by `showFeatures`. | New |
| R-02 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u1-framework-views/functional-design/functional-spec.md > BR1.10; rules.md > BR1.10 | `project:open` starts `detectHarnesses(root)` in the background from the folder alone (ipc.js line 761 onward). It reads the static `markers` in `src/shared/harnesses.js`, where opencode's markers are `.aidlc` and `.opencode/command/aidlc.md`. Nothing in the harness path knows the framework, and the result is a cached promise, so it would go stale if detection changes later. No component row names `harness.js` or `harnesses.js`. | Say where framework reaches harness detection: pass `framework` into `detectHarnesses`, or add `.opencode/` as a marker. Add the file to the components list. State whether the cached result is refreshed when the framework changes. | New |
| R-03 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u1-framework-views/functional-design/functional-spec.md > BR1.3, BR1.1; rules.md > BR1.1 logic | BR1.3 turns on "when U4 ships", and BR1.1 depends on a "usable saved choice" from U2. U1 defines no switch for this: no flag, no parameter on `detectProject`, and no input for a saved choice. The unit order is U1 then U4, so U4 would have to rewrite `detectProject` in order to switch the rule on. The Detection shape (`framework`, `source`, `reason`, `views`, `activeSpace` and `spaces` for speckit) is also not written out as one definition. | Write the Detection shape once. Give `detectProject` an explicit input for the saved choice, defaulting to none. Name the single point where U4 enables BR1.3 (for example a parameter), so that U4 does not edit U1's logic. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u1-framework-views/functional-design/functional-spec.md > Workflow step 5 and State diagram; frontend-components.md | The main-side changes are not in the components table: `projectService.js` and `ipc.js` (the `!detection.isAidlc` guard in `watchForSetup` at line 344, and the `project:open` branch at line 766). `watchForAidlc` must also start firing on `.specify/` appearing, which is not named. The state diagram has no speckit to aidlc arrow, and Spec Kit has no watcher, so a Spec Kit project that later gets `aidlc/spaces/` is only picked up on reopen. | Add the main-side files and the watcher change to the components. Either state that speckit to aidlc is only seen on reopen, or add a watcher. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u1-framework-views/frontend-components.md > Menu row; functional-spec.md > BR1.8 | `menu.js` has a `STATE_KEYS` whitelist (line 11) and a default state that only know `isAidlc`. The spec says "menu items AI-DLC offers", but only two items use it today (cost, github, lines 91–92). The foot label for `null` is also undefined: today it shows the literal `'Auctum'`. | List the exact menu items that are gated, and note the whitelist change. State the foot label for `null`. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| sensor-traceability (functional-design, u1-framework-views) | pass: true, no gaps, orphans or invalid entries, findings_count 0 | Traceability to US1.1, FR1 and NFR6 is complete. |

### Summary

The rules and traceability are sound, but three design gaps would force guessing at implementation: the default or fallback view for non-AI-DLC frameworks, how framework reaches harness detection, and how U4 switches on BR1.3. They add up to more than two Major findings, so the verdict is NOT-READY. This is advisory.
