# Code Generation Plan: u3-replies

## Summary

- Builds: agent replies (US-0506 US3.1): the Stop hook branch, the opencode idle handler, reply parsing, the reply lifecycle with stale rules, the terminal auto-response classifier, typed delivery, the reply page and the latest-message strip
- Touches: new `src/main/agentReplies.js`, `src/renderer/ReplyPage.jsx`, `src/renderer/LatestMessageStrip.jsx`; small edits in `.thadeus/hooks/dialog.sh`, `.opencode/plugins/thadeus-dialog.js`, `src/main/agentAdapters.js`, `agentChannel.js`, `agentEvents.js`, `agentIpc.js`, `ipc.js`, `src/preload/index.js`, `src/renderer/AgentDialog.jsx`, `ArtifactReader.jsx`, `ProjectView.jsx`, `App.jsx`, both locale files, `vitest.config.mjs`, `contract-summary.md`
- Tests: about 125 new tests in 12 new and 3 extended files: unit tests per component, the real `dialog.sh` under `sh` and `dash` in the `scripts` project, and integration tests through a real AgentChannel (Claude Code and opencode replays of scenario 7)

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "classic",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided by the person at the practices interview (Q1: test first, TDD, for new work). Earlier Code Generation plans recorded the framework default `test-after`; the affirmed choice replaces it for new work.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with two projects, `main` (node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale). Currently 353 `it`/`test` call sites by static count; the knowledge base's \"about 490\" is not reconciled.\n- **Coverage floor**: 80% line coverage, checked in CI with `@vitest/coverage-v8` (Q2). Not set up yet; it is to be added to the repository and to the `verify` job of `.github/workflows/release.yml`. No coverage is measured today.\n- **Suite green before merge**: the full `npx vitest run tests/` suite must pass before any story pull request merges. CI runs it on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is checked by hand before a release tag. Jsdom tests do not run the built app."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "tdd",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - Red: write the failing tests and record the failing command output.",
      "Data model / database behavior - Green: implement only enough behavior to pass.",
      "Data model / database behavior - Refactor: improve the implementation while tests stay green.",
      "Repository / data access - Red: write the failing tests and record the failing command output.",
      "Repository / data access - Green: implement only enough behavior to pass.",
      "Repository / data access - Refactor: improve the implementation while tests stay green.",
      "Business logic - Red: write the failing tests and record the failing command output.",
      "Business logic - Green: implement only enough behavior to pass.",
      "Business logic - Refactor: improve the implementation while tests stay green.",
      "API / endpoint - Red: write the failing tests and record the failing command output.",
      "API / endpoint - Green: implement only enough behavior to pass.",
      "API / endpoint - Refactor: improve the implementation while tests stay green.",
      "Frontend behavior - Red: write the failing tests and record the failing command output.",
      "Frontend behavior - Green: implement only enough behavior to pass.",
      "Frontend behavior - Refactor: improve the implementation while tests stay green.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:0db0277d6c2a6742d5982d08f7356d1c82513cd0b72253b0dfc67cfe6f0770b5",
  "contract_sha256": "sha256:71418531672369a589adb02df222cd73b11bef5572eb7b2d1ef1c7ed1dcfb984"
}
```

## Sources

- Unit design: `functional-design/functional-spec.md`, `rules.md` (BR6.1–BR6.18), `entities.md`, `functional-design-questions.md` (Q1 B: a reply turns red after 20 s).
- NFR: `nfr-requirements/*.md` (NFR1.8–NFR1.12, NFR2.4–NFR2.6, NFR3.13–NFR3.23, NFR4.4–NFR4.8, NFR5.13–NFR5.24, NFR6.4–NFR6.6, NFR7.3, NFR7.4, NFR8.5–NFR8.7; D7–D11) and `nfr-design/*.md` (PD7–PD13, SD8–SD12, RD10–RD17, SCD6–SCD10, OD5–OD9, LC2–LC12), `nfr-design/reviews/review-01.md` (R-01 to R-07), `nfr-design/nfr-design-questions.md` (four settled points).
- Cross-Unit: `u5-notifications/nfr-design/logical-components.md` "Amendments for Code Generation" (item 2: one sanitizer, no `escapeUnsafe`, no `g` flag on exported patterns).
- Inception: `contract-design/contract-summary.md` (C1–C6), `user-stories/stories.md` (US3.1, AC3.1.1–AC3.1.5), `requirements-analysis/requirements.md`, `units-generation/unit-of-work.md` (U3), `delivery-planning/bolt-plan.md` (B3 runs beside B2; B2 merges first).
- Base: u1-questions as merged on `feat/US-0506`: `u1-questions/code-generation/code-summary.md`, `source-manifest.json`, and the code it lists.

## Decisions made in this plan

| ID | Decision | Why |
|---|---|---|
| K1 | **Typed delivery is two writes in one send, to one pty.** The store checks, moves the reply to `sending` and writes the cleaned text in one synchronous step. It then writes one `'\r'` to the same captured `ptyId` after `ENTER_GAP_MS` (50 ms for both harnesses). The Enter is written only when the text write succeeded, the reply is still `sending` for this send, and no `terminalInput` of that pty, newer event of the session, session end or `dispose` came in the gap. Each send has its own timer and token; an Enter is never written for a different send, never twice, never to another pty. | NFR design review R-02 and the brief: a TUI may take `text + '\r'` in one chunk as a paste and leave a newline in its input box. The separate Enter is the safe default for both harnesses; RD13's "one write" becomes its fallback, not the reverse. `ponytail:` comment: the 50 ms gap is a guess, raise it per harness if the manual run shows a missed submit. |
| K2 | **The NFR2.5 manual run decides the gap, not the shape.** On the release Mac, with `THADEUS_AGENT_HOOKS=1 THADEUS_TIMING=1 npm run dev` and the hand-installed Stop entry, scenario 7 runs 20 times per harness: the agent ends with "Which name should the file have?", Dev answers "notes.md". Pass: the agent takes "notes.md" as its next prompt, its input box is empty afterwards (no stray newline, no unsent text), and `answerDelivered − answerClicked` ≤ 1 s. The result fills RD13's harness table in `code-summary.md`. A missed submit raises that harness's `ENTER_GAP_MS` value and the run repeats. | The automated tests cannot run a real TUI (team practices: jsdom does not run the built app); the bolt plan leaves manual runs to Build and Test. |
| K3 | **Reply code lives in a new module `src/main/agentReplies.js`** (classifier, reply lifecycle, LatestMessage, typed delivery), created by `createReplies(deps)` inside the store with the store's `events`, `sessions`, `move` and `emit`. `agentEvents.js` gets one-line dispatches only. The reply page is the new `src/renderer/ReplyPage.jsx`, and AgentDialog gets one branch per place. | This Unit is built beside u2-permissions in a worktree without u2. New files keep the shared files' diffs to a few lines (listed under "Shared lines with u2"). `src/main/agent*.js` is already under the 80% per-file glob. |
| K4 | **Replies use `queued`.** A reply is `queued` while its project has an open question or permission event, otherwise `shown`. `emit` promotes a project's queued replies once none is left (BR6.8). u1's questions still go straight to `shown`. | BR6.5 and SCD6 tell a reply that was on screen (`stale`) from one that was not (`ended`). |
| K5 | **At most one stale reply per session.** When a session's shown reply goes stale, an older stale reply of that session ends. `ponytail:` comment: the older stale page and its typed text are dropped; keep a list if the person ever needs more than the latest stale text. | SCD6: "1 open, 1 stale" at any step, so stale pages cannot pile up. |
| K6 | **A typed reply lingers 3 s as `ended` with `via: 'typed'`**, as u1 lets a session-ended event linger, so the page can say "Sent to <harness> as typed, followed by Enter." `agentEvents.answer` returns `{ state: 'sent', via: 'typed' }`, within C4's existing output. | W1 step 6; no new C4 state. |
| K7 | **The M4 body goes through `cleanBody`**, as u1's review fix 4 does for question bodies. This supersedes PD13's "never cleaned" for the shown body only: bidi and zero-width characters are removed, everything else is kept as the agent sent it. The strip's line goes through `stripUnsafe(firstLine(text))` (review R-06). | One rule for every agent body in the dialog. The strip line cannot reorder the tab name next to it. |
| K8 | **The classifier adds DECRPM and the kitty keyboard reply** to SD10's table: `ESC [ ? <n> ; <n> $ y` and `ESC [ ? <n> u`. XTVERSION (DCS) and anything else unknown stay "the person's input". | Review R-04; the default fails toward stale. |
| K9 | **Typed answer check is on `line.trim()`** after `cleanLine`: a whitespace-only answer is "answer does not fit the event" in main and keeps Send disabled in the renderer. The 64 KB bound is `utf8Bytes(line) ≤ 65 536`. | Review R-03; settled point 3. |
| K10 | **The Stop branch copies with `head -c 1048577`** in a background job on fd 3, with a 2 s watchdog subshell, as RD10 writes it with review R-05's byte cap. No redirect on `:` or `exec`. | Must-have from the reviews: the hook never blocks the agent. |
| K11 | **Strip opening.** The strip's Answer calls `onOpenReply(eventId)` from App, which calls `agentEvents.reopen` and then focuses and opens the dialog. Show opens a small read-only `<dialog>` owned by the strip, built from `ReplyMessage` (the same body component as the reply page) and Close only (W9). | No new push; App already owns the dialog's open state and focus. |
| K12 | **opencode shapes are provisional,** as u1's are (NFR5.7): the idle event is `{ type: 'session.status', properties: { sessionID, status: { type } } }`; the context result is `{ session: { id, parentID? }, messages: [{ info: { role }, parts: [{ type, text }] }] }`. A `parentID` means a sub-agent session: nothing is written. Text parts of the last assistant message are joined with a blank line. `ponytail:` comment in the plugin and the adapter naming the manual run that confirms them. | The functional spec's known limit for sub-agent sessions. |

## Shared lines with u2 (merge note)

B2 merges before B3 (bolt plan). These are the only lines in files u2 may also change; each is kept to one dispatch or one list entry:

- `.thadeus/hooks/dialog.sh`: the `case ${1:-} in …` line gains `reply) waits=0 ;;`; the reply block is new lines after the traps.
- `src/main/agentAdapters.js`: one `if (kind === 'reply') return …Reply(body);` line at the top of each `parse`; the reply parsers are new functions.
- `src/main/agentEvents.js`: `PUBLIC` gains `message`, `staleReason`; `openOf` skips `kind: 'reply'`; `onRaw` gains the reply dispatch and the moved-on call; `emit` calls `replies.promote`; `move` lingers for `endedBy: 'typed'`; `answer`, `close`, `endSession` delegate for replies; new members `terminalInput`, `reopen`, `latest`.
- `src/main/agentChannel.js`: the over-limit branch gains the `reply` case beside the `question` one; one new `onRefusedReply` member.
- `src/main/agentIpc.js`: the answer handler picks `checkReply` for `answer.reply`; new handlers and `terminalInput`.
- `.opencode/plugins/thadeus-dialog.js`: one `ctx.event.on('session.status', …)` line; the handler is a new function.
- `src/renderer/AgentDialog.jsx`: title, where line, page branch, close branch, autofocus line.
- `sv.json`, `en.json`, `vitest.config.mjs`, `contract-summary.md`: new keys, entries and rows only.

## Steps

### Structure, contracts and runner

- [x] Step 1: Contract amendments, before any code (documentation). In `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md`, with the file-edit tool, add each as a marked "U3 amendment":
  - **C2:** `onRefusedReply: { subscriber: AgentEventStore, payload: { sessionId: string, reason: string }, note: "only for an over-limit reply file whose header is authentic (RD11)" }`; `terminalInput: { called_by: IpcRouter's pty:write handler, before writeSession, input: { ptyId: string, data: string }, effect: "the person's input moves the tab's open reply on (BR6.6, SD10)" }`; the `typed` row of "Delivering an answer" reads "the text, then one Enter to the same pty after a short gap in the same send, only while the tab still waits (K1)".
  - **C3:** `state` gains `dismissed | stale` (kind reply only); `staleReason: "movedOn" | "sessionEnded" | "notShown"` (optional, kind reply); `message.empty: boolean`.
  - **C4:** `agentEvents.latest` out becomes `{ tabId, harness, text, arrivedAt, status, eventId, truncated, empty } | null` with `status: "waiting" | "answered" | "sessionEnded" | "notShown"`; new `agentEvents.reopen: { in: { eventId: string }, out: { state: "shown" }, errors: ["unknown event", "event not open"], unit: U3 }`; `agentEvents.close` notes `dismissed` for a reply.
  - **C6:** the Stop entry: `Stop (no matcher) timeout 10 command: [ -n "$THADEUS_SESSION_DIR" ] && [ -f "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" ] && sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" reply; exit 0`.
  - Check, without change: u5 amendment 2 is done (`src/shared/agentText.js` exists, no `escapeUnsafe`, no exported `g` pattern), and the C4 focus row is present.
  - Traces: C2, C3, C4, C6; RD11, SD10, SD12, PD7; review R-01, R-02.
- [x] Step 2: Runner check on the unchanged tree. Run `npx vitest run tests/main/agentText.test.js tests/main/agentEvents.test.js tests/main/dialogScript.test.js` and record the pass count. Then in `vitest.config.mjs`: add `tests/main/dialogScriptReply.test.js` to `TIMED` (the real-time `scripts` project), and add per-file 80% line entries for `src/renderer/ReplyPage.jsx` and `src/renderer/LatestMessageStrip.jsx` beside u1's (setting the floor up, never lowering one). Traces: NFR8.5, NFR8.7, OD9.
- [x] Step 3: Test data. Add `tests/fixtures/agent-events/claude/stop-which-name.json` (`hook_event_name: "Stop"`, `stop_hook_active: false`, `last_assistant_message: "Which name should the file have?"`, a `transcript_path` naming a marker file), `stop-done.json` ("Done. All 353 tests pass."), `stop-empty.json` (`""`), `stop-no-message.json` (field absent), `stop-swedish.json` (Swedish, emoji with ZWJ, quotes). Add `opencode/idle-which-name.json` (`{ event, context }` per K12), `idle-child.json` (with `parentID`), `idle-two-parts.json`. Update `tests/fixtures/agent-events/README.md`: built from the documented shapes; the NFR2.5 run replaces or confirms them. Traces: NFR8.6, NFR2.4.

### Sanitizer (LC12, already built by u1)

- [x] Step 4: Confirm the u3 cases (test first; expected to pass on the first run because u1 built LC12). New `tests/main/agentTextReply.test.js` (6 tests): `cleanLine` on each SD8 input (`\x03`, `\x1b[201~`, `\x1b[2J`, `\r\n` as two spaces, `\t`, `\x7f`, `\x9b`, U+202E, U+2067, U+200E, U+200F, U+061C, U+200B, U+FEFF, U+00AD, U+2028), ZWJ emoji and `åäö` unchanged; `cleanLine('\n \t').trim() === ''`; `utf8Bytes` at 65 536 and 65 537 with a 4-byte emoji on the boundary; `stripUnsafe(firstLine(...))` removes U+202E from a strip line; `UNSAFE.test` gives the same result twice (no `lastIndex`). Any failure is fixed in `src/shared/agentText.js` for all Units. Traces: SD8, K7, K9, review R-03, R-06, R-07; NFR3.14.

### Hook script: the Stop branch (LC8)

- [x] Step 5: Red. New `tests/main/dialogScriptReply.test.js` (scripts project, each case for every shell in `SHELLS`, real time, `{ timeout: 15_000 }`), each asserting exit 0 and 0 bytes on stdout and stderr:
  1. 1 048 576-byte stdin closed at once: one `.evt`, header `THADEUS-EVENT v1 reply <secret>`, body equal to stdin byte for byte, elapsed < 1 s (NFR4.5).
  2. stdin held open 8 s after 200 bytes: exits between 1.9 s and 2.6 s; one `.evt` with the header and those 200 bytes (RD10, review R-04).
  3. 1 200 000-byte stdin: the `.evt` body is exactly 1 048 577 bytes (review R-05).
  4. stdin closed (`<&-`): no `.evt` (NFR4.7).
  5. `events/` not writable; the session folder read-only; a folder planted at the `.evt` name: no `.evt` (NFR4.7).
  6. App absent (variable unset, script folder deleted, `alive` missing) through the exact C6 Stop string under `sh -c`: ≤ 100 ms in each of 20 runs (PD7, NFR4.4, NFR4.8).
  7. The test's stdout pipe reaches EOF when the script exits, with stdin held open: no `head` or `sleep` keeps it (RD10).
  8. Source check of the branch: no `while`, no `answers/`, exactly one `sleep` and it is inside the watchdog subshell, no redirect on `:` or `exec` (NFR5.24, SCD10, PD7 code review).
  9. Integration: the real script writes into a real AgentChannel session on a temp root; the channel emits one raw event of kind `reply` whose body equals the fixture `stop-which-name.json`.
  10. Both shells give the same exit status and output for cases 1 to 6 (NFR8.5).
  Run `npx vitest run tests/main/dialogScriptReply.test.js`; record the failures (the script exits 0 for `reply` without writing).
- [x] Step 6: Green. In `.thadeus/hooks/dialog.sh`: `reply) waits=0 ;;` on the `case` line; after the traps, the reply block:
  ```sh
  if [ "$1" = reply ]; then
    f=$d/events/$n.tmp
    printf 'THADEUS-EVENT v1 reply %s\n' "$s" > "$f" || exit 0
    { head -c 1048577 <&3 >> "$f" & c=$!; } 3<&0 || exit 0
    ( sleep 2; kill "$c" ) </dev/null >/dev/null 3<&- & k=$!
    wait "$c"
    kill "$k"
    mv "$f" "$d/events/$n.evt" || exit 0
    exit 0
  fi
  ```
  Header comment: kinds now include `reply` (never waits, BR6.1), and `head -c` joins `sleep 0.1` as the non-POSIX features (both on macOS, GNU and busybox). Traces: BR6.1, RD10, K10, NFR4.5, NFR4.7, NFR5.24.
- [x] Step 7: Refactor. Keep the u1 question cases green (`npx vitest run tests/main/dialogScript.test.js tests/main/dialogScriptReply.test.js`); review the branch against SCD10's list and RD10's notes; the comment names why fd 3 sits on a brace group (u1 review R-01).

### opencode plugin: the idle handler (LC9)

- [x] Step 8: Red. New `tests/main/opencodePluginReply.test.js` (9 tests, stubbed V2 `ctx`, real timers, fresh module per test): idle top-level writes one `.evt` with kind `reply` and body `{ event, context }` unchanged; idle child (`parentID`) writes none; `busy` and `retry` write none; `ctx.session.context` rejecting, throwing synchronously, and an `fs` write error: nothing thrown, one `thadeus-dialog` log line naming `context read failed` or `event write failed` and the error code, no message text, no secret, no `.evt`; a context that never resolves: the handler returns `undefined` at once and a second idle event is still handled (PD12); without `THADEUS_SESSION_DIR` nothing is subscribed. Run `npx vitest run tests/main/opencodePluginReply.test.js`; record the failures.
- [x] Step 9: Green. In `.opencode/plugins/thadeus-dialog.js`: a new `onIdle(ctx, env, event)` (one promise chain, its own `catch`, not awaited) and one `ctx.event.on('session.status', (event) => void onIdle(ctx, env, event))` line. `ponytail:` comment naming K12's provisional shapes and the run that confirms them. Traces: BR6.2, RD15, PD12, OD7, NFR4.6, NFR5.13, NFR3.22, AC3.1.4.
- [x] Step 10: Refactor. Reuse `writeEvent`, `filesOf` and `nextName`; u1's `tests/main/opencodePlugin.test.js` stays green.

### Adapter: reply parsing (LC3)

- [x] Step 11: Red. New `tests/main/agentAdaptersReply.test.js` (12 tests): Claude `stop-which-name.json` gives `{ ok: true, kind: 'reply', message: { text, truncated: false, empty: false } }`; the text equals `last_assistant_message` byte for byte, also for `stop-swedish.json` (PD13); `transcript_path` is never read (an `fs` spy records no open, the marker is absent; SD12); `stop-empty.json` and a whitespace-only message give `empty: true` (NFR2.6); `stop-no-message.json` gives `{ ok: false, reason: 'no last message' }`; a cut JSON body gives `not JSON`; 65 536 bytes unchanged, 65 537 cut with `truncated`, a cut point inside a 4-byte emoji cuts before it (SCD7); opencode `idle-which-name.json` gives the same message as Claude; `idle-two-parts.json` joins 40 KB and 30 KB parts, then cuts; a context with no assistant message gives `no last message`. Run `npx vitest run tests/main/agentAdaptersReply.test.js`; record the failures.
- [x] Step 12: Green. In `src/main/agentAdapters.js`: new `claudeReply(body)` and `opencodeReply(body)` using `parseJson` and `cutUtf8`; one dispatch line at the top of each `parse`. Traces: BR6.3, SD12, SCD7, D8, AC3.1.5, NFR3.17.
- [x] Step 13: Refactor. One shared `message(text)` helper builds `{ text, truncated, empty }` for both; `npx vitest run tests/main/agentAdapters.test.js tests/main/agentAdaptersReply.test.js` green.

### Channel: an over-limit reply (LC2)

- [x] Step 14: Red. New `tests/main/agentChannelReply.test.js` (4 tests, real channel on a temp root): a 1 048 577-byte reply file with the right secret is deleted, logs one `[agent-events] too large` line and fires `onRefusedReply({ sessionId, reason: 'too large' })` once, with no raw event; with a wrong secret it fires nothing; an over-limit `question` still gets u1's hand-back and no refused-reply call; leftover reply `.evt` files from an earlier run emit nothing after the first `openSession` (RD16). Run `npx vitest run tests/main/agentChannelReply.test.js`; record the failures.
- [x] Step 15: Green. In `src/main/agentChannel.js`: a `refused` listener set and `onRefusedReply(fn)`; in the over-limit branch, a header with kind `reply` that passes `checkHeader` calls the listeners. Traces: RD11, SCD9, NFR5.23, C2.
- [x] Step 16: Refactor. One `checkHeader(result.head, session)` call serves both kinds; `npx vitest run tests/main/agentChannel.test.js tests/main/agentChannelReply.test.js` green.

### Business logic: the auto-response classifier (LC4, SD10)

- [x] Step 17: Red. New `tests/main/agentReplies.test.js`, classifier part (5 tests): `isAutoResponse` is true for each SD10 "true" input plus DECRPM `\x1b[?2026;2$y` and kitty `\x1b[?1u` and a chunk of several (`\x1b[I\x1b[12;40R`); false for each SD10 "false" input (`a`, `notes.md`, `\r`, `\x03`, bracketed paste, `\x1b[A`, `\x1b[Ia`, lower-case finals, XTVERSION `\x1bP>|xterm(1)\x1b\\`, `''`, a non-string); the regex is case-sensitive; repeated calls agree (no shared `lastIndex`); Shift-F3 `\x1b[1;2R` is true (the named F3 collision, documented). Run `npx vitest run tests/main/agentReplies.test.js`; record the failures (module missing).
- [x] Step 18: Green. New `src/main/agentReplies.js` with the module header (US-0506 u3 US3.1, BR6.6, SD10, NFR3.20) and `export const isAutoResponse`: one anchored, non-global pattern per SD10 plus K8's two forms. `ponytail:` comment on the F3 collision with its ceiling (count a CPR only within 1 s of a DSR 6 query in that pty's output if a TUI ever binds modified F3). Traces: SD10, K8, review R-04, NFR1.10.
- [x] Step 19: Refactor. Build the pattern from named parts (CPR, DSR, DA, OSC colour, focus, DECRPM, kitty) so each table row is one line; tests green.

### Business logic: reply lifecycle, stale rules, LatestMessage, reopen (LC4)

- [x] Step 20: Red. New `tests/main/agentEventsReply.test.js` (22 tests; the real `createAgentEventStore` with u1's fake channel and pty, fake timers, a recording `onChanged`):
  - accept: a reply is pushed as `kind: 'reply'`, `state: 'shown'`, `message` present, no secret or session folder in `JSON.stringify` of any push (SD12); `onAdded` fires once (BR6.9).
  - order: with an open question in the project the reply is `queued`; it becomes `shown` in the push that ends the question (BR6.8, K4).
  - duplicate: the same text while the newest reply is open is dropped with no push, no `onAdded`, no log (RD17, BR6.4); different text is a newer event; the same text after the first was answered is a new reply.
  - moved on, one test per trigger × prior state: a newer reply, a question, an `answered` event; `terminalInput` with a keystroke, a paste, Enter, an unknown sequence; each takes a `shown` reply to `stale` with `staleReason: 'movedOn'`, a `queued` or `dismissed` one to gone; one push in the same synchronous call; `pty.write` never called (RD12, PD10, SD9).
  - `terminalInput` with each SD10 auto-response keeps the reply `shown`; for a pty with no open reply it makes no push (PD10).
  - refused reply (RD11): `onRefusedReply` and an adapter refusal (cut JSON, no last message) take a `shown` reply to `stale` with `staleReason: 'notShown'`, `queued`/`dismissed` to gone, and set the LatestMessage `status: 'notShown'`; an empty message is not a refusal.
  - tab exit: `endSession` takes a `shown` reply to `stale` with `staleReason: 'sessionEnded'`, others to gone; LatestMessage `sessionEnded`; u1's questions of the session still end as before (BR6.7).
  - close: `close` on a shown reply returns `{ state: 'dismissed' }`, writes no answer file, types nothing, LatestMessage unchanged (BR6.14); on a stale reply it ends it.
  - reopen: a dismissed reply of a live session is `shown` again in one call with one push (PD11); refused with "event not open" for `queued`, `shown`, `stale`, `sending`, ended and a question, "unknown event" for an unknown id, each changing nothing and logging one line (SD9, OD6).
  - LatestMessage: replies from 3 tabs of one project and 2 of another give exactly 2 entries, the newest by `arrivedAtMs` then `tabId`; the crafted `1700000000-100000` / `1700000000-99999` names follow `mtimeMs` (SCD8); `latest()` returns exactly the eight C4 keys and never `sessionId` (SD12); `null` before any reply (RD16).
  - pile-up: 100 replies from one session, none on screen (queued behind a question): 1 open, 0 others; the first shown: 1 open and 1 stale at every step, and after Close 1 open (SCD6, K5).
  - quiet paths: accept, duplicate, dismiss, reopen, stale, answer make zero `console.*` calls (OD8).
  Run `npx vitest run tests/main/agentEventsReply.test.js`; record the failures.
- [x] Step 21: Green. In `src/main/agentReplies.js`: `createReplies({ events, sessions, move, emit, channel, pty, timing, log, newId })` with `add`, `moveOn(sessionId, reason)`, `refused(sessionId)`, `terminalInput(ptyId, data)`, `endSession(sessionId)`, `close(ev)`, `reopen(eventId)`, `latest(projectId)`, `promote(projectId)`; LatestMessage in a `Map` keyed by project. In `src/main/agentEvents.js`, the one-line hooks listed under "Shared lines with u2", and `channel.onRefusedReply(({ sessionId }) => replies.refused(sessionId))`. Traces: BR6.4–BR6.9, BR6.13–BR6.15, BR6.18, RD11, RD12, RD16, RD17, SCD6, SCD8, SD9, SD12, PD10, PD11, OD8, AC3.1.2, AC3.1.3.
- [x] Step 22: Refactor. Every state change goes through u1's `move`, so each pushes once; `npx vitest run tests/main/agentEvents.test.js tests/main/agentEventsReply.test.js` green.

### Business logic: typed delivery (LC4, LC5)

- [x] Step 23: Red. New `tests/main/agentEventsTyped.test.js` (14 tests, fake pty recording `write(id, data)`, fake timers):
  - "notes.md" on a shown reply: first write `('pty-A', 'notes.md')` at once, then after `ENTER_GAP_MS` exactly one `('pty-A', '\r')`; the answer resolves `{ state: 'sent', via: 'typed' }`; the event is `ended` with `via: 'typed'` for 3 s, then gone; LatestMessage `answered`; `answerDelivered` stamped after the Enter write (BR6.12, K1, K6, PD9).
  - two tabs: only the asking tab's pty is written (NFR3.15).
  - errors, each with no write: unknown event; `queued`, `dismissed`, `stale`, ended; session not live ("session ended"); an audit event ("fallback event: answered in the terminal path"); empty after cleaning (`\x1b\x07`), whitespace only (`'\n  \t'`), 65 537 cleaned bytes ("answer does not fit the event"); 65 536 cleaned bytes is written (SD8, SD9, K9, review R-03).
  - cleaning: the bytes written are `cleanLine(text)` and then `'\r'` only; a bidi override and CR LF in the answer do not reach the pty (BR6.11).
  - a second answer while `sending` is refused ("event not open") and adds no write (BR6.10).
  - in the gap: a `terminalInput` keystroke on that pty, a newer event of the session, and `endSession` each cancel the Enter (no `'\r'` written at all, then or later), make the reply `stale` and reject the answer with the translated "enter skipped" sentence; a `terminalInput` auto-response does not cancel it (K1).
  - `ptyOf` null at Send: "session ended", nothing written; `pty.write` throwing on the text: "send failed: <cause>", no Enter, back to `shown` with `lastError`, and a second Send succeeds (RD14).
  - `dispose` during the gap writes no Enter.
  - one log line per refusal and failure, `[agent-events]` prefix, no secret (OD6).
  Run `npx vitest run tests/main/agentEventsTyped.test.js`; record the failures.
- [x] Step 24: Green. `answerReply` in `src/main/agentReplies.js`: the check of BR6.10's order, `cleanLine`, the move to `sending` and the text write in one synchronous step, then the Enter timer per K1 (token per send, captured `ptyId`), using the store's `pty.write` (`writeSession`), never `pty:write`. In `agentEvents.js`, `answer` delegates for `kind: 'reply'`; `move` lingers for `endedBy: 'typed'`. `ponytail:` comment on `ENTER_GAP_MS` (K1). Traces: BR6.10–BR6.12, RD13, RD14, SD8, SD9, PD9, NFR1.9, NFR2.4, NFR2.5, NFR3.15, NFR3.16, NFR3.19, NFR5.15, NFR5.16, AC3.1.1.
- [x] Step 25: Refactor. Share `failSend` with the refusal path; all store test files green.

### API: IPC router, `pty:write`, preload (LC6)

- [x] Step 26: Red. New `tests/main/agentIpcReply.test.js` (7 tests): `agentEvents:answer` with `{ reply: { text } }` reaches the store; a non-string text or one over 262 144 UTF-16 units is refused with "answer does not fit the event" before the store (SD9); `agentEvents:latest` checks the project id and returns the store's value; `agentEvents:reopen` checks the id (at most 64 characters) and returns `{ state: 'shown' }`; `terminalInput(ptyId, data)` forwards to the store. Extend `tests/main/ipc.test.js` (1 test): the `pty:write` handler calls `terminalInput` before `writeSession`, in the same call, and still writes when no agent wiring exists. Extend `tests/main/preload.test.js` (1 test): `agentEvents.latest` and `agentEvents.reopen` invoke `agentEvents:latest` and `agentEvents:reopen`. Run `npx vitest run tests/main/agentIpcReply.test.js tests/main/ipc.test.js tests/main/preload.test.js`; record the failures.
- [x] Step 27: Green. `src/main/agentIpc.js`: `checkReply`, the two handlers, `terminalInput`. `src/main/ipc.js`: `'pty:write': async (_event, id, data) => { agent?.terminalInput(id, data); return writeSession(id, data); }`. `src/preload/index.js`: `latest` and `reopen` members. Traces: C2, C4, SD9, SD10, SD12, BR6.6, NFR1.10, NFR1.11.
- [x] Step 28: Refactor. `checkId` reused for reopen; u1's `agentIpc.test.js` and `preload.test.js` cases green.

### Integration: the main side end to end

- [x] Step 29: Integration tests (written after the layers; a failure here is fixed in the layer it names). New `tests/main/agentRepliesFlow.test.js` (4 tests; real AgentChannel on a temp root, real store and adapters, fake pty, real time with short waits):
  1. Claude Code replay of scenario 7: the `stop-which-name.json` event file gives one shown reply; answering "notes.md" writes exactly `notes.md`, then `\r`, to that tab's pty (NFR2.4, AC3.1.1).
  2. The same with the opencode `idle-which-name.json` (AC3.1.4).
  3. RD11's named test: a reply is shown with an answer pending in the renderer; a 1 048 577-byte reply file for the session arrives; the file is gone, one `too large` line, the reply is `stale` with `notShown`, no pty write, LatestMessage `notShown`, exactly one push for the change.
  4. OD5 with the timing switch on (`createTimingLog` on a temp dir): an answered reply gives exactly four lines with the four field names and no text field; a dismissed reply gives two; with the switch off no file exists.
  Run `npx vitest run tests/main/agentRepliesFlow.test.js`.

### Frontend: the reply page in AgentDialog (LC10)

- [x] Step 30: Red. New `tests/renderer/AgentDialogReply.test.jsx` (16 tests, Swedish locale, stubbed `window.bridge.agentEvents`, fake timers past `GUARD_MS` through a `show()` helper as u1's tests do):
  - M4 page: kind "MEDDELANDE", title "Meddelande från Claude Code", where line with project, tab and time, the body rendered through `FileContent`, an empty field with `document.activeElement` on it after arrival and after reopen (BR6.9, PD11).
  - empty message line; the reply's "Shortened at 64 KB" line when `truncated` (AC3.1.5).
  - unsafe payload (`<script>`, `<style>`, `<iframe>`, `<img onerror>`, `javascript:` and `file:` links, U+202E): no such element or `on*` attribute, anchors only for `http(s)`, no `openExternal` on render, no U+202E in the DOM (SD11, K7).
  - Enter in the field sends `answer(eventId, { reply: { text } })` once; `stamp(eventId, 'answerClicked')` first; Send disabled for an empty or whitespace-only field and for 65 537 cleaned bytes (K9).
  - within `GUARD_MS` of the page showing, Enter and Send do nothing and the text stays.
  - after a question page, a digit key on the reply page sends nothing (the question page's key handler is cleared).
  - sent line "Skickat till Claude Code som text, följt av Enter." for `ended` with `via: 'typed'`.
  - each stale reason shows its line, the field and Send disabled, the typed text still in the field after the push, Copy (writes the text to the clipboard) and Open the terminal as buttons (BR6.13, RD12).
  - a failed send shows the one-sentence cause and keeps the text (RD14).
  - Esc and Close call `close(eventId)` (BR6.14); on a stale page Close calls it too.
  - overdue: the red title absent at 19.9 s, present at 20 s; never for a stale reply; after dismiss and reopen it starts at 0 again (BR6.17, Q1).
  - `dialogShown` stamped once per first paint, not for a queued reply (PD8).
  Run `npx vitest run tests/renderer/AgentDialogReply.test.jsx`; record the failures.
- [x] Step 31: Green. New `src/renderer/ReplyPage.jsx` (header: US-0506 u3 US3.1, BR6.9–BR6.14, BR6.17, PD13, SD11): `ReplyMessage` (body through `cleanBody` and `FileContent`, empty line, truncated line) and `ReplyPage` (form with `data-autofocus` field, Send, status and stale lines, Copy; sets `keysRef.current = null`; Send disabled by `cleanLine`, `trim` and `utf8Bytes` from `src/shared/agentText.js`). In `src/renderer/AgentDialog.jsx`: the reply title and where line, `ev.kind === 'reply' ? <ReplyPage …/>` beside `HookPage`, Close calls `close` for a shown or stale reply, and the focus effect focuses `[data-autofocus]` when present, else the title. `data-testid` values: `agent-dialog-reply`, `agent-dialog-reply-text`, `agent-dialog-reply-send`, `agent-dialog-reply-status`, `agent-dialog-reply-stale`, `agent-dialog-reply-copy`. Traces: BR6.9–BR6.14, BR6.17, PD8, PD11, PD13, SD11, NFR6.4–NFR6.6, NFR7.3, NFR7.4, AC3.1.1, AC3.1.2, AC3.1.5.
- [x] Step 32: Refactor. u1's `tests/renderer/AgentDialog.test.jsx` stays green unchanged; the reply branch adds no behaviour to question or audit pages.

### Frontend: the latest-message strip (LC11)

- [x] Step 33: Red. New `tests/renderer/LatestMessageStrip.test.jsx` (10 tests, Swedish locale): `latest` null shows "Inget meddelande från agenten än" with no button (BR6.18, RD16); waiting shows the tab, the arrival time, the first non-empty line as inline Markdown (bold kept, no `p`, `h1`–`h6`, `ul`, `ol`, `pre` or `blockquote` in its DOM) and Answer; `(besvarat)`, `(sessionen avslutad)`, `(nyare meddelande visas inte)` each with Show; `(förkortat)` when truncated; a U+202E line shows without U+202E (review R-06); the strip refetches on `agent-events:changed` for its own project only; Answer (by keyboard) calls `onOpenReply(eventId)`; Show opens the read-only view with the full Markdown, the truncated line, no field and Close only, and calls nothing beyond `latest` (W9); an unsafe payload renders no script, style, iframe or `on*` attribute (SD11). Run `npx vitest run tests/renderer/LatestMessageStrip.test.jsx`; record the failures.
- [x] Step 34: Green. New `src/renderer/LatestMessageStrip.jsx` (header: US-0506 u3 US3.1, BR6.15, BR6.16, BR6.18, SD11, D11) with `data-testid` values `latest-message-strip`, `latest-message-tab`, `latest-message-line`, `latest-message-answer`, `latest-message-show`, `latest-message-view`, `latest-message-view-close`. `src/renderer/ArtifactReader.jsx`: `FileContent` gains `inline` (a `span`, `allowedElements` for inline elements with `unwrapDisallowed`, the same `markdownComponents` and `skipHtml`). `src/renderer/ProjectView.jsx`: the strip above `TerminalPanel`, with an `onOpenReply` prop. Traces: BR6.15, BR6.16, BR6.18, SD11, D11, PD13, AC3.1.2, AC3.1.3, AC3.1.5, NFR6.5.
- [x] Step 35: Refactor. The strip and the Show view share `ReplyMessage`; `tests/renderer/ProjectView.test.jsx` green.

### Frontend: App pager and reopen

- [x] Step 36: Red. Extend `tests/renderer/AppShell.test.jsx` with a new `describe` (3 tests): questions come before replies in the pager whatever their arrival (BR6.8); `queued` and `dismissed` replies are not in the pager, and the dialog closes by itself when only a dismissed reply is left; the strip's Answer calls `reopen` once, then the dialog opens on that reply (AC3.1.3). Run `npx vitest run tests/renderer/AppShell.test.jsx`; record the failures.
- [x] Step 37: Green. `src/renderer/App.jsx`: the pager comparator puts `kind: 'reply'` after the others and the filter drops `queued` and `dismissed` replies; `openReply(eventId)` (reopen, then `setPopupFocus({ id })` and `setPopupOpen(true)`, a failure logged with `console.warn`); `onOpenReply={openReply}` to `ProjectView`. Traces: BR6.8, BR6.14, PD11.
- [x] Step 38: Refactor. The existing AppShell cases stay green.

### Texts, configuration, verification, records

- [x] Step 39: Texts (written test first with each frontend step; this step checks them together). `sv.json` and `en.json` gain the same keys through `t()` with ICU placeholders: `agentDialog.kind.message`; `agentDialog.reply.title`, `titleOverdue`, `where`, `empty`, `truncated`, `answer`, `sent`, `copy`, `stale.movedOn`, `stale.sessionEnded`, `stale.notShown`; `agentDialog.errors.enterSkipped`; `latestMessage.none`, `answer`, `show`, `answered`, `sessionEnded`, `notShown`, `shortened`, `label`, `view`. Run `npx vitest run tests/main/i18nKeys.test.js`. Traces: PD13, NFR7.3.
- [x] Step 40: Environment and build configuration. No new dependency and no `package.json` change. Run ESLint and Prettier on this Unit's files (commands in `unit-test-instructions.md`) and fix what they report; no rule is turned off.
- [x] Step 41: Construction Verification Command, on its own line: `npx vitest run tests/ --coverage && npx eslint . && npx prettier --check .`. The full suite is green, project line coverage stays at or above 80%, and each per-file floor holds (`src/main/agent*.js`, `src/shared/agentText.js`, `AgentDialog.jsx`, `ReplyPage.jsx`, `LatestMessageStrip.jsx`, the plugin). A threshold is never lowered; a gap is reported. Traces: NFR8.5–NFR8.7, OD9.
- [x] Step 42: Documentation and traceability. Write `code-summary.md` (files, decisions K1–K12, test counts, coverage, the RD13 harness table left "to be recorded" for the K2 manual run), `source-manifest.json` (every application path created or changed) and `traceability.json`. Add the Stop entry to the development hook entries in `unit-test-instructions.md` as the manual run needs it. Feature docs: US-0506 stays "🚧 in progress, for v0.2.5" in `docs/FEATURES.md` and `docs/features/epic-05-workflow-control.md`; AC3.1.1–AC3.1.5 are ticked only in Deployment Execution. The u5 note stays open: AC5.1.1 still limits red to questions and permissions, which u5 aligns (Q1). Traces: US3.1, project rule on feature docs.

## Story to step traceability

| Story / criterion | Steps |
|---|---|
| US3.1 AC3.1.1 (reply opens with an empty field; "notes.md" and Enter into that tab only) | 3, 5, 6, 11, 12, 20, 21, 23, 24, 29, 30, 31 |
| US3.1 AC3.1.2 (Close types nothing; the message stays in the strip) | 20, 21, 30, 31, 33, 34 |
| US3.1 AC3.1.3 (strip shows the newest reply, time, tab, Answer opens the dialog) | 20, 21, 33, 34, 36, 37 |
| US3.1 AC3.1.4 (opencode idle shown like Claude Code) | 3, 8, 9, 11, 12, 29 |
| US3.1 AC3.1.5 (cut at 64 KB with a line) | 11, 12, 30, 31, 33, 34 |
| Contracts C2, C3, C4, C6 | 1, 15, 21, 27 |

## Deliberate shortcuts (`ponytail:` comments in code)

| Where | Shortcut | Ceiling and upgrade |
|---|---|---|
| `src/main/agentReplies.js` `ENTER_GAP_MS` | 50 ms between the text and Enter, the same for both harnesses | a guess until the K2 run; make it per harness, or longer, if a TUI misses the submit |
| `src/main/agentReplies.js` classifier | a modified F3 (`ESC [ 1 ; <mod> R`) counts as a cursor report | count a CPR only within 1 s of a DSR 6 query in that pty's output, if a TUI ever binds modified F3 |
| `src/main/agentReplies.js` stale replies | one stale reply per session; an older stale page and its typed text are dropped | keep a list per session if more than the latest stale text is ever needed |
| `.opencode/plugins/thadeus-dialog.js`, `src/main/agentAdapters.js` | provisional opencode idle and context shapes (K12) | replace with the recorded payloads of the NFR2.5 run |
| `src/shared/agentText.js` (u1, unchanged) | emoji tag flags lose their tag characters | keep tags after U+1F3F4 if such a flag is ever typed |

## Risks and open points

- **The K2 manual run is the only proof that Enter submits** in Claude Code 2.1.325 and opencode 2.1.4. Until it runs, the 50 ms gap is unverified; the design's fallback (raise the gap) is a constant change, not a redesign.
- **Merge with u2.** The lines under "Shared lines with u2" will need a hand merge when B3 follows B2. All are additive; none changes u2's behaviour.
- **Another project Stop hook that makes Claude continue** (functional spec, known limits) is not detected; the next event makes the reply stale.
- **`head -c`** is not in POSIX `head`; it exists on macOS, GNU coreutils and busybox, which covers the supported systems, and the script comment says so.
