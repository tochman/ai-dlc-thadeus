## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-14T16:21:17Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md > W1 step 6, W1b step 4, W3 step 1; rules.md > BR3.2 | "Sent" means only that the answer file was written. The design never says how the store learns the answer was not consumed. In W3 the script gives up on its own clock and the store marks timedOut on its own timer, so an answer written in that gap sits in a file nobody reads. The state shows sent and the person's answer is lost. C2 `writeAnswer` lists the error "event file no longer waiting", but no step defines how that is detected, for example whether the script deletes the event file or leaves a marker when it exits. In W1b, if `session.form.reply` fails the plugin "writes nothing back" and the store is told nothing, so the event stays sent while opencode still shows its form. The "send via keys" fallback has no trigger. | Define the consumption signal. For example, the script removes or renames the event file when it exits, and `writeAnswer` refuses a file that is gone. Say how the opencode plugin reports a failed reply (a "failed" file or a new event kind), and how the store then moves sending to shown or timedOut and retries via keys. Also say whether `sent` means "written" or "consumed" and what the dialog shows in each case. | New |
| R-02 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md > W3 step 2; rules.md > BR3.2, BR3.3 | The keys path (after a timeout, and opencode's fallback) is specified only as "type the picker keys the adapter computed from the event's options". It does not say what the keys are for multi-select (tick and confirm), for an own answer (typing into the picker's Other field), or for a 2 to 4 question batch (tab navigation between questions). Readiness is checked against the first option label of the first question only. A developer cannot write the adapter's key builder or its tests without guessing the picker's behaviour. | Specify the key sequence per question type for the Claude Code picker, and for opencode if it applies. Alternatively, state that the keys path supports only single-select, single-question events and that other events show "answer in the terminal" after a timeout (and update AC1.1.6/AC1.1.8 handling to match). Add the picker-readiness check for later questions in a batch, or say it is skipped. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/entities.md > Question.options; rules.md > BR1.4 | The `options` attribute allows `min: 0`, but BR1.4 rejects any event whose questions lack a non-empty option list. The two files disagree on whether a question with no options is valid. | Make them match: set `min: 1`, or explain what the dialog shows for a question with only an own-answer field and relax BR1.4. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md > W1 step 2; contract-summary.md > C1 event_file.name | The spec names event files `<ms>-<pid>-<rand>.tmp`, but contract C1 fixes `<epoch-ms>-<pid>.evt`. The contract is owned by U1 and consumed by U2 and U3, so the two must not differ silently. | Update C1's name pattern to include the random part, or drop the random part from the spec. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md > Interfaces used, Hook entries for development | The deliverables are not listed. `dialog.sh` (its 100 ms polling, alive check, timeout and file writes in BR1.2/BR1.3) and the opencode plugin are behaviour U1 must build and test, yet the spec places the files "installed by hand until u4" and fixes only the entries. It is unclear whether U1 ships the script and where it lives in the repository. | State that U1 delivers `dialog.sh` and its tests, and name the repository path it is committed to. For opencode, say that the plugin file is developed in U1 or deferred to u4, and mark the opencode questions as provisional in the acceptance coverage. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| aidlc engine sensor-traceability --stage functional-design | PASS: gaps [], orphans [], invalid entries [], findings_count 0 | Story and rule traceability is structurally complete. It does not test the delivery and keys-path gaps above. |

### Summary

The design is mostly sound: it answers the contract's provisional questions with a documented spike, keeps the hook, store and renderer responsibilities clear, and its state machine and rules cross-reference cleanly. Two Major gaps remain. Delivery of a hook or plugin answer is never confirmed, so an answer can be lost while the state reads sent, and the keys-path fallback is undefined for multi-select, own-answer and batch questions. Both should be settled before code generation. Verdict READY (advisory, two Major findings).
