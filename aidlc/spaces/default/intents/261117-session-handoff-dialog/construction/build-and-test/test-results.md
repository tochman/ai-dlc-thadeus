# Test Results: US-0213 + US-0026

Run on 2026-11-17, branch `feat/US-0213`. `main` holds nothing newer than the branch (`git log HEAD..origin/main` is empty), so no merge was needed.

| Command | Exit | Result |
|---|---|---|
| `npx electron-vite build` | 0 | main, preload and renderer built |
| `npm run lint` | 1, then 0 | 1 error: an invisible non-breaking space inside a regex in `tests/renderer/AgentDialogHandoff.test.jsx:61`, fixed as ` `. Then 0 errors and 29 warnings, all in files this work did not touch. |
| `npm run format:check` | 1, then 0 | 10 files not Prettier-formatted, fixed with `prettier --write`. Then clean. |
| Unit-test instructions (15 files) | 0 | 448 of 448 passed |
| `npm run coverage` (full suite) | 0 | 145 files, 1796 of 1796 passed. Lines 92.19%, statements 90.06%, branches 83.01%, functions 86.92%. |

In-stage fixes: 2, the lint error and the formatting. Both are formatting only; no test or behaviour changed.

New modules' line coverage: `contextSize.js` 100%, `agentReplies.js` 94.05%. `ipc.js` is at 93.29% overall, but the new handoff wiring in it is not exercised by a test (see code-summary).

## Checks that need a real session (not runnable here)

These need a running Claude Code or opencode session in the app with the updated hooks. This session cannot clear or compact itself to test them.

- OQ1: after `/clear`, does `/aidlc --resume` show the waiting gate again and accept the approval?
- Does PreCompact's printed instruction reach Claude Code's compaction?
- opencode's real payloads (V2) and `/compact` taking no argument.
- The US-0026 root cause, confirmed against a recorded empty `Stop` payload (it was found by reading the code).
- The handoff page and its settings section, by eye, in the LCARS look. The tests checked them in jsdom only.

Steps are in `integration-test-instructions.md` § Manual.

**Decision (2026-11-17):** the person chose "Accept failure". T9–T12 stay Unverified and are owed as manual checks before the v0.2.9 release tag.
