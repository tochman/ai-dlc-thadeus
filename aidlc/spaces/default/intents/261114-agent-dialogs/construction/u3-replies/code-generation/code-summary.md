# Code Summary: u3-replies

Agent replies for US-0506 US3.1: the Claude Code Stop hook, the opencode idle handler, reply parsing, the reply lifecycle, typed delivery, the reply page and the latest-message strip. The work was test first (TDD); each Red run was recorded before its Green step.

## Files

- **New:** `src/main/agentReplies.js` (classifier, lifecycle, LatestMessage, typed delivery), `src/renderer/ReplyPage.jsx`, `src/renderer/LatestMessageStrip.jsx`.
- **Changed:** `.thadeus/hooks/dialog.sh` (the `reply` branch), `.opencode/plugins/thadeus-dialog.js` (`onIdle`), `src/main/agentAdapters.js`, `agentChannel.js` (`onRefusedReply`), `agentEvents.js` (dispatches only), `agentIpc.js`, `ipc.js` (`pty:write`), `src/preload/index.js`, `src/renderer/AgentDialog.jsx`, `ArtifactReader.jsx` (`inline`), `ProjectView.jsx`, `App.jsx`, both locale files, `vitest.config.mjs`, and `contract-summary.md` (marked "U3 amendment" rows).
- The full list is in `source-manifest.json`.

## Decisions K1 to K12

All twelve were applied as planned. K1: the text first, then one `'\r'` after `ENTER_GAP_MS` = 50 ms, with a token per send. K4: queued, then shown by `promote` inside `emit`. K5: one stale reply per session. K6: the typed reply lingers for 3 s. K7: the body goes through `cleanBody`. K8: the classifier also accepts DECRPM and the kitty reply. K9: the answer is checked on `trim()` and is at most 65 536 bytes. K10: the watchdog and the byte cap (see deviation 1). K11: the strip's Answer calls `reopen`, then the dialog opens. K12: provisional opencode shapes, with `ponytail:` comments.

## Tests

- **Verification command:** `npx vitest run tests/ --coverage && npx eslint . && npx prettier --check .` converged. 86 files and 840 tests pass. ESLint shows 0 errors (the 21 warnings were already there). Prettier is clean.
- **New for this Unit:** 182 tests: 177 in 12 new files and 5 in 3 extended files (`ipc.test.js`, `preload.test.js`, `AppShell.test.jsx`). The script tests run under `sh` and `dash`.
- **Project line coverage:** 87.29%.
- **Per-file line coverage:** `agentReplies.js` 94%, `agentEvents.js` 99.4%, `agentAdapters.js` 100%, `agentChannel.js` 97.6%, `ReplyPage.jsx` 100%, `LatestMessageStrip.jsx` 91.2%, `AgentDialog.jsx` 97.2%, plugin 98.4%. No threshold was lowered.

## Deviations

1. **`dialog.sh` Stop branch (K10).** The plan's literal `head -c … <&3 &` lost the 200 bytes in the stdin-held-open case on macOS. BSD `head -c` keeps a partial block in `fread` until EOF, so killing it loses that block. Now a background `cat` feeds `head -c 1048577` through a pipe, and the watchdog kills `cat`. The cap, the 2 s watchdog, fd 3 on brace groups and "no redirect on `:` or `exec`" are unchanged. An extra `{ true; } 3<&0 || exit 0` checks for a closed stdin before the header is written, so no `.tmp` is left behind.
2. **u1 test edited.** `tests/main/agentAdapters.test.js` used `reply` as its example of an unknown kind. That line now uses `notice`, because the plan makes `reply` a known kind.
3. **TDD order, Steps 23–24.** `answerReply` was written in the same module pass as Step 21, so the Step 23 tests ran against code that already existed and no failing run was recorded for them.
4. **Reopen refusals for `sending` and the lingering `ended` state** are tested in `agentEventsTyped.test.js`, not `agentEventsReply.test.js`, because those states need a typed send.
5. **`ipc.test.js`.** The wiring's `terminalInput` is spied through a wrapping mock of `agentIpc.js`. The "no agent wiring" case cannot happen in that file, because registering the handlers creates the wiring. It is covered by `agent?.` in the code.
6. **`AppShell.test.jsx`.** Its ProjectView stub now renders the real `LatestMessageStrip`.

## Open

- **K2 / NFR2.5 manual run** (RD13 harness table), still to be done on the release Mac:

  | Harness | Runs | Enter submits | Input box empty | `answerDelivered − answerClicked` |
  |---|---|---|---|---|
  | Claude Code 2.1.325 | to be recorded | to be recorded | to be recorded | to be recorded |
  | opencode 2.1.4 | to be recorded | to be recorded | to be recorded | to be recorded |

- **Stop entry for that run:** it is already listed under "Development hook entries" in `unit-test-instructions.md`.
- **Merge with u2:** the lines listed under "Shared lines with u2" in the plan will need a hand merge.
- **Feature docs:** US-0506 stays "🚧 in progress, for v0.2.5". AC3.1.1–AC3.1.5 are ticked in Deployment Execution. The u5 note on AC5.1.1 also stays open.
