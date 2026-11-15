# Code Summary: u2-permissions

Permission prompts in the agent dialog: Claude Code `PermissionRequest` and opencode `permission.asked` are parsed, shown on an M3 page and answered only through the waiting hook (Allow once, Allow always with the agent's own rules, Deny or Reject). Every other path hands back to the terminal.

## What was built

| Layer | Files | What |
|---|---|---|
| Adapters | `src/main/agentAdapters.js` | `parse('permission', …)` for both harnesses, `permissionAnswer`, `DENY_MESSAGE`; caps and escapes (SCD8, SD9); Allow always only for shapes that can be shown in words (SD11, Q1 A) |
| Hook script | `.thadeus/hooks/dialog.sh` | `question \| permission) waits=1` (RD14) |
| Channel | `src/main/agentChannel.js` | `WAITING` set for the too-large hand-back (RD11); `formatLog` shows control and bidi characters as escapes (OD7) |
| opencode plugin | `.opencode/plugins/thadeus-dialog.js` | `permission.asked` and `permission.replied`, `deliverPermission`, the `replied` set, one handler wrapper (RD13) |
| Store | `src/main/agentPermissions.js` (new), `src/main/agentEvents.js`, `src/main/agentTiming.js` | answer check (SD10), delivery through the hook only (RD10), Close, time-out, terminal answer, private `alwaysRules` map; the K12 end rule; `agentConfirmed` stamp |
| Order | `src/shared/agentOrder.js` (new) | `byPager`, used by the store and `App.jsx` (SCD9) |
| IPC | `src/main/agentIpc.js` | exactly `{ question: { picks, own } }` or `{ permission: { choice } }` |
| Renderer | `src/renderer/AgentDialog.jsx`, `App.jsx`, `theme.css`, both locale files | `PermissionPage`, guard on keys, clicks, Esc and window focus, the 5 s hand-back notice |

Records: `contract-summary.md` (C1 entry timeout, C3 additive fields, C4 `via` note) and u2 `rules.md` BR5.3 (Q1 A wording).

## Tests

- Before: 74 files, 658 tests, 86.86% lines.
- After (Construction Verification Command `npx vitest run tests/ --coverage && npx eslint . && npx prettier --check .`, through `aidlc engine swarm check u2-permissions`): **77 files, 840 tests passed (182 new), 87.48% lines**. ESLint 0 errors (21 warnings, none new in this unit's code); Prettier clean. `"converged":true`. The first review's run failed the PD7 64 KB timing case (91.3 ms against 50 ms under full-suite load and coverage). That case now takes the median of 7 warm runs, still against 50 ms. The re-run after that change: 77 files, 840 tests passed, 87.48% lines, `"converged":true`.
- Unit coverage command (unit-test-instructions.md): 388 tests, 98.29% lines over this unit's files. Per file, lines: `agentAdapters.js` 100, `agentPermissions.js` 100, `agentOrder.js` 100, `agentIpc.js` 100, `thadeus-dialog.js` 100, `agentEvents.js` 98.2, `agentChannel.js` 97.5, `AgentDialog.jsx` 97.3, `agentTiming.js` 93.8.
- Red runs (failing before Green): adapters 64/64, script 12 (the 6 waiting cases under sh and dash), channel 2, plugin 12, store 44, timing 1, IPC 3, renderer 19.

## Deviations

1. **TDD order, store layer.** `agentPermissions.js` and `agentOrder.js` were written just before their tests. The store Red still failed (44 cases, store not yet wired), but the 5 `agentOrder` cases passed at their first run.
2. **`createPermissions` signature.** `add(ev, parsed)` instead of K1's `add(raw, session, parsed)`: the store builds the shared event fields once and the module keeps only the permission part.
3. **A Claude Code `sent` permission ends 3 s after it is sent** (the functional spec's "sent → ended at once"), so "Skickat till Claude Code." is visible; nothing else ends it.
4. **`permission.alsoInTerminal`** is a new key: u1's `alsoInTerminal` says "Frågan" (the question).
5. **Two u1 tests changed only their example of an unknown kind** (`permission` is a kind now): `agentAdapters.test.js` uses `idle`, `dialogScript.test.js` uses `bogus`.
6. Store test "start-up with leftover folders" is not repeated in the store; the store has no start-up path, and u1's channel test (RD6) covers it.

## Load note

The first script run missed u1's 2.5 s window by 23 ms and 55 ms in two u1 question cases, at load average 6 to 8 (u3 builds beside this unit). The rerun passed 48/48, and the verification run passed. No window was widened.

## Development hook entry (K19, for the person to paste by hand)

```text
PermissionRequest  matcher *  timeout 600  command: [ -n "$THADEUS_SESSION_DIR" ] && [ -f "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" ] && sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" permission; exit 0
```

opencode needs nothing more. The manual runs (NFR1.8–NFR1.10, NFR2.5, the deny run for `interrupt: true`, the Allow always runs) are left to Build and Test and the release check, together with replacing the docs-built fixtures (K7).

## Open

- Input guard is u1's 400 ms for permission pages too (K8, approved with the plan; PD8 designed 500 ms).
- The opencode field names and Claude Code suggestion shapes are provisional until the recorded payloads (K7, risks 2 and 3).
- u3 must adopt `byPager` and the K12 end rule when it merges after this Bolt (risk 5).
- Error texts stay worded for questions (risk 8).
