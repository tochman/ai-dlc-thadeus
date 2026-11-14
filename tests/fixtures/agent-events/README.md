# Agent event fixtures (US-0506 u1)

These payloads follow the spike tables in the Functional Design (`functional-spec.md`: Claude Code 2.1.325, opencode 2.1.4). They are built from the documented shapes, not recorded:

- `claude/`: Claude Code hook stdin for `AskUserQuestion` (`PreToolUse`, and `post-tool-use.json` for `PostToolUse`). One file per answer scenario of NFR2.1 (`gate-2026-11-14`, `reordered`, `batch-four`, `multi-two`, `own-answer`), plus the malformed `no-questions`, `five-questions`, `no-text` and `empty-label`.
- `opencode/`: the plugin's `form.created` event for the same five scenarios, plus `form-replied.json` and `form-cancelled.json`. The opencode shape is provisional (NFR5.7).

The manual run on the release Mac (NFR2.2, before the release pull request) saves the real event files of the five scenarios. They replace or confirm these fixtures.

## Permission prompts (US-0506 u2)

Built from the same harness docs, not recorded (u2 plan K7):

- `claude/permission-*.json`: Claude Code `PermissionRequest` hook stdin (`session_id`, `cwd`, `hook_event_name`, `tool_name`, `tool_input`, `permission_suggestions`). `permission-bash` and `permission-bash-dirs` carry suggestions the dialog can offer as Allow always; `permission-edit`, `-empty-suggestions`, `-setmode`, `-deny-rule` and `-extra-key` carry none it may offer; `-question-tool`, `-no-tool` and `-input-string` are refused; `-unicode` holds Swedish text, emoji and a non-ASCII path.
- `opencode/permission-*.json`: the plugin's `permission.asked` event (`properties: { requestID, sessionID, permission, patterns, always, metadata }`), with and without always-patterns, and refused shapes; `permission-replied.json` is `permission.replied`.

The opencode field names (`requestID`, `permission`, `patterns`, `always`, `metadata.command`) and the Claude Code suggestion shapes are provisional. The manual run on the release Mac (NFR2.5, before the release pull request) saves the real payloads of the six choice runs; they replace or confirm these fixtures, and the adapter follows. A wrong guess fails safe: no Allow always in the dialog, or a hand-back to the terminal.
