# Agent event fixtures (US-0506 u1)

These payloads follow the spike tables in the Functional Design (`functional-spec.md`: Claude Code 2.1.325, opencode 2.1.4). They are built from the documented shapes, not recorded:

- `claude/`: Claude Code hook stdin for `AskUserQuestion` (`PreToolUse`, and `post-tool-use.json` for `PostToolUse`). One file per answer scenario of NFR2.1 (`gate-2026-11-14`, `reordered`, `batch-four`, `multi-two`, `own-answer`), plus the malformed `no-questions`, `five-questions`, `no-text` and `empty-label`.
- `opencode/`: the plugin's `form.created` event for the same five scenarios, plus `form-replied.json` and `form-cancelled.json`. The opencode shape is provisional (NFR5.7).

The manual run on the release Mac (NFR2.2, before the release pull request) saves the real event files of the five scenarios. They replace or confirm these fixtures.
