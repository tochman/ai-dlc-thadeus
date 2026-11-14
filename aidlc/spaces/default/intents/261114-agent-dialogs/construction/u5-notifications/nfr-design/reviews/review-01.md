## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-14T18:34:29Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-design/security-design.md > SD50 step 3 `plainLine` and SD52 permission row | The permission body (tool plus first line of the command, Q1 B) is built as one `{text}` and then goes through `plainLine`, which drops `*`, `_`, `~~`, backticks, `>`, `#` and list markers and turns `[x](y)` into `x`. A command is not Markdown. `rm -rf ~/*` or `rm -rf ./my_dir` would be shown altered (`*` and `_` removed), so the notification misstates what the person is being asked to approve. That defeats the purpose of Q1 B ("see what is asked without opening the window"). The SD52 test only checks that a marker on `detail`'s first line appears, and contradicts SD50 as written. | Build the permission `{text}` from `stripUnsafe` and `cutGraphemes` only, with no `plainLine`. Keep `plainLine` for question and reply text. Add a test that `*`, `_`, `~`, `#`, `[a](b)` in a command's first line appear unchanged. | New |
| R-02 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-design/logical-components.md > LC52 SettingsSnapshot ("until the first read the defaults apply") and PD50 | `settingsNow()` is a synchronous copy that is replaced only by `getSettings` reads and `setSettings` resolves. `src/main/settings.js` `getSettings` reads the file on each call and keeps no cache today. Nothing says main reads settings at startup. A hook event or audit question that arrives before any read notifies with defaults, even when the person saved `replyAlerts: 'off'`, `questionAlerts: 'off'` or `notificationSound: false`. That is the lock-screen exposure the person chose to control. | Prime the copy in main startup before the event bridge and audit watcher start, and before the first `notifyEvent`. Add a test that a saved `'off'` is honoured by the first event after startup, with no prior renderer read. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-design/logical-components.md > "The one shared sanitizer" code block | The illustrative `cleanLine` and `SET` contain the literal characters U+2028, U+2029 and U+200D (verified by byte dump). U+2028 and U+2029 are line terminators, so inside a regex literal they are a syntax error. All three are invisible in review and easy to lose in an editor. Copying the block breaks module load. | Write them as ` `, ` ` and `‍` escapes, in the code and in the ZWJ constant. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-design/security-design.md > SD50 steps 1 and 2 | `firstLine` picks the first non-empty line and cuts it to 2 000 code units before the unsafe characters are removed. A first line made only of zero-width or format characters is "non-empty" and can leave an empty body. Agent text that opens with 2 000 or more invisible characters followed by a real line does the same. The empty-notification case is not designed. | Pick the first line after `stripUnsafe`, or fall back to the next line or a translated placeholder when the cleaned text is empty. Add a test for each. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-design/logical-components.md > shared sanitizer export table (`UNSAFE`, `cleanLine`, `visibleText`) | Exports are coherent only if callers know that `UNSAFE` and `cleanLine` keep ZWJ while `visibleText` escapes it. Both are documented, but there is no test that `UNSAFE.test` and `cleanLine` agree on every character of the class. The tag-block removal also breaks emoji flag sequences; the cost is noted, but SD50 does not carry it. | Add a property-style test that `cleanLine(c)` is empty or a space exactly when `UNSAFE.test(c)` is true, for each range listed. Repeat the flag-tag cost in SD50. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| aidlc engine sensor-traceability --stage nfr-design | pass: true, gaps [], orphans [], missing_from_table [], invalid_entries [], findings_count 0 | Traceability is complete. |

### Summary

Q1 B and Q2 A are implemented as the person answered. The 1 s target is honest about what it measures. The decided-id cap, the Linux body escaping, the overdue state and the C4 `agentEvents.focus` ordering (only `src/` and `tests/` have no other `questions:focus` hits) all hold. Two Major gaps should be fixed before Code Generation: the permission command line must not go through the Markdown stripper, and the synchronous settings copy needs priming at startup. Neither is grounds for NOT-READY on its own.
