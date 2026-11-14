## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-14T16:53:38Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/functional-spec.md > State machine: InstallPreview, and rules.md > BR7.14 | The preview state machine says a preview whose file changed becomes `refused`, but BR7.14 and W6 say it is marked `superseded` and a new preview is built. A partial write (BR7.16 `partiallyWritten`) has no preview state at all: it is neither `applied` nor `refused`. | Pick one outcome for "changed since preview" and state which final state a partial write leaves, so the preview state and ApplyResult.outcome agree. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/rules.md > BR7.12 and BR7.15 | An unparsable `.claude/settings.json` gets status `missing` with a reason, and BR7.15 then shows the M7 strip with an Install button for `missing`. W7 says there is no apply button in that case, so the strip offers an action that cannot succeed. `missing` also hides the difference between "no entries" and "file cannot be used". | Say what the strip shows when the status carries a `reason`, for example the reason sentence and Details only, with no Install. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/rules.md > BR7.1 | The rule reads the kind as "the word after dialog.sh", but the command is `sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" question; exit 0`. The next characters are a closing quote, a space and `question;`. The tokenizing rule is not stated, so a developer could pick a parser that mislabels `question;` or `question"` as `unknown`. | State the extraction, for example the first bare word after the quoted script path, up to whitespace or `;`, and add a test row for it. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/functional-spec.md > Known limits | Claude Code merges hooks across `.claude/settings.json`, `.claude/settings.local.json` and user settings. App entries copied into another settings file are never read (the three fixed paths), so such a tab would fire each hook twice. The re-read-then-rename write in BR7.14 and BR7.16 also leaves a small window in which AI-DLC can write the file between the digest check and the rename. | Add both as Known limits (duplicate hooks from other settings files, and the concurrent-write window), or say they are accepted. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| aidlc engine sensor-traceability (functional-design, u4-install traceability.json) | `{"pass":true,"gaps":[],"orphans":[],"missing_from_table":[],"missing_from_upstream_ids":[],"invalid_entries":[],"invalid_targets":[],"findings_count":0}` | Traceability is complete: no gaps, orphans or bad targets. |

Cross-checks done:
- **Hook entries versus the sibling units:** the entry set matches u1, u2 and u3. `PreToolUse` and `PostToolUse` on `AskUserQuestion` (timeouts 600 and 10), `PermissionRequest` `*` (600), `Stop` (10), the exact guarded command and the plugin path `.opencode/plugins/thadeus-dialog.ts` all agree.
- **Contract C6:** the provisional script name and plugin path are fixed here, and contract-summary C6 still shows `thadeus-dialog.js`. The spec records that this is replaced.
- **Existing code:** `detectHarnesses` and `resolveInRoot` exist. `isEngineOwned` in `src/main/fileWrite.js` covers `.claude` and `.opencode`, which supports the separate write path in BR7.13.

### Summary

The design is implementable and consistent with the shared contracts and the u1 to u3 entry sets: the guarded command, the write order, the re-read check and the status derivation all trace end to end. The open points are four minor wording and edge-case gaps, with no blocking architecture problem.
