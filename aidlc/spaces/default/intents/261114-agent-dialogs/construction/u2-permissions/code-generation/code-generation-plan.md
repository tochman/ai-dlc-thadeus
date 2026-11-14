# Code Generation Plan: u2-permissions

## Summary

- Builds: permission prompts in the agent dialog: Claude Code `PermissionRequest` and opencode `permission.asked` parsed, shown on an M3 page, and answered only through the waiting hook (allow once, allow always with the agent's own rules, deny), with every other path handing back to the terminal
- Touches: .thadeus/hooks/dialog.sh, .opencode/plugins/thadeus-dialog.js, src/main/agentPermissions.js (new), src/main/{agentAdapters,agentEvents,agentChannel,agentIpc,agentTiming}.js, src/shared/agentOrder.js (new), src/renderer/{AgentDialog,App}.jsx, src/renderer/theme.css, the two locale files, vitest.config.mjs, tests/fixtures/agent-events/, contract-summary.md and u2 rules.md
- Tests: about 115 new tests in 10 files (unit tests per component, plus integration tests of the real script with the `permission` argument under sh and dash, and of the script against a real channel folder)

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

- Unit design: `construction/u2-permissions/functional-design/` (functional-spec.md W1–W6, the harness facts table, the state machine and open points; rules.md BR5.1–BR5.13; entities.md Permission, PermissionChoice, Answer.choice), `nfr-requirements/` (NFR1.8–NFR1.13, NFR2.4–NFR2.7, NFR3.13–NFR3.21, NFR4.4, NFR4.5, NFR5.13–NFR5.24, NFR6.4–NFR6.6, NFR7.3, NFR7.4, NFR8.5, NFR8.6; D7–D11), `nfr-design/` (SD8–SD14, RD10–RD15, PD7–PD11, SCD6–SCD10, OD5–OD9, logical-components.md "Amendments for Code Generation"), `nfr-design/nfr-design-questions.md` (Q1 = A), `nfr-design/memory.md` and `nfr-design/reviews/review-01.md` (R-01 to R-05).
- Inception: `inception/contract-design/contract-summary.md` (C1–C6 as amended by u1), `inception/user-stories/stories.md` (US2.1, AC2.1.1–AC2.1.4), `inception/requirements-analysis/requirements.md`, `inception/units-generation/unit-of-work.md`, `inception/delivery-planning/bolt-plan.md` (B2, built beside B3, merged before it).
- Cross-Unit: u5 `nfr-design/logical-components.md` "Amendments for Code Generation" 2 (`visibleText` lives in `src/shared/agentText.js`, not in `agentAdapters.js`).
- The base this Unit builds on, already merged on `feat/US-0506`: u1 `code-generation/code-summary.md` and `source-manifest.json`, and the code they list: `src/shared/agentText.js`, `src/main/{agentChannel,agentAdapters,agentEvents,agentIpc,agentTiming,pty,ipc,index,i18n}.js`, `src/preload/index.js`, `src/renderer/{AgentDialog,App}.jsx`, `.thadeus/hooks/dialog.sh`, `.opencode/plugins/thadeus-dialog.js`, `vitest.config.mjs`, `eslint.config.mjs`, and the tests `tests/main/{agentEvents,dialogScript,opencodePlugin,agentChannel}.test.js`, `tests/renderer/AgentDialog.test.jsx`.

## What u1 already gives this Unit

Checked in the code, so this plan does not build it again:

- `src/shared/agentText.js` with `visibleText` (the `\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}` class plus the tag block, built from `String.fromCodePoint`, so no raw U+2028 or U+2029 sits in the source: NFR Design review R-01 and R-02 are settled), `cutGraphemes` and `utf8Bytes`.
- `src/main/agentAdapters.js` `cutUtf8` (SCD1).
- `agentChannel.answerState` already returns `{ folder, waiting, answerPresent, nack }` (RD10's `folder` flag), plus `retract`, `isLive`, and the `hookGaveUp` error of `writeAnswer`.
- The store's `hookWaits` (u1 RD3), the single transition `move()`, the per-event `timer`, Close that is ignored outside `shown`/`timedOut` (so Close during `sending` already writes nothing), and a time-out timer that fires only on `shown`.
- `dialog.sh` with the `printf ''` wait marker (R-01), the `sleep 0.1` probe (R-03) and silent exits; the single-instance lock in `index.js` (R-02); "sent" only with a live session and an existing folder (R-04). SD14's three prerequisites are in place.
- AgentDialog: focus on the page title (`tabIndex=-1`), `GUARD_MS = 400` set while rendering, and the `onKeyDown` hook on the `<dialog>`.

## Key decisions

| # | Decision | Why |
|---|---|---|
| K1 | Permission logic goes in a new `src/main/agentPermissions.js`: `createPermissions({ channel, adapters, timing, move, hookWaits, sessionOf, log })` returns `add(raw, session, parsed)`, `answer(ev, answer)`, `close(ev)`, `answered(ev)`, `timeout(ev)`, `endEvent(eventId)`. It receives no `pty` and imports nothing that types keys, so a permission cannot reach `writeSession` by construction (SD13). `agentEvents.js` only dispatches by `kind`. | SD13 asks for a module the keys sender is not reachable from; it also keeps u2's diff out of the parts of `agentEvents.js` that u3 changes beside it |
| K2 | `alwaysRules` live in a private `Map` inside `agentPermissions.js`, keyed by `eventId`, deleted when the event ends. The event object holds only `permission: { what, detail, cwd, truncated, choices }`, and each choice only `{ label, effect, refuses, enabled }`. `view()` in the store gains the `permission` key; nothing else. | SD11, SCD10 |
| K3 | Choice labels are built in main by the adapter through the shared `t()` (`src/shared/i18n.js`), as SD11 says: `agentDialog.permission.allowOnce`, `allowAlways` with `{rules}` (lines joined by `\n`), `allowAlwaysBare`, `deny` (Claude Code), `reject` (opencode). The renderer shows `label` as text with `white-space: pre-wrap`. `ponytail:` a language switch while a permission is open keeps the old language on that page until the next event; rebuild labels on `language` change if that matters. | SD11, PD10, NFR7.3 |
| K4 | Allow always follows the Q1 A amendment: Claude Code only when every suggestion is `addRules` with `behavior: "allow"` and a non-empty `rules` array of `{ toolName (non-empty string), ruleContent? (non-empty string) }`, or `addDirectories` with a non-empty array of non-empty strings, each with a non-empty `destination` string and no other key; opencode only when the request carries a non-empty `always` array of non-empty strings. Caps in code points (`Array.from`): at most 8 lines, each at most 256, at most 1 024 together; over a cap the choice stays with `enabled: false` and the bare label. `updatedPermissions` is the parsed `permission_suggestions` value itself, never rebuilt. `ponytail:` an unknown key or type drops the dialog's Allow always (the terminal still offers it) until the fixture is re-recorded for the newer Claude Code. | SD11, logical-components.md BR5.3 amendment, NFR Design review R-05 |
| K5 | Text caps and escapes in the adapter, cut first, then `visibleText`: `what` at 200 code points, `detail` `cutUtf8(…, 65536)` then `visibleText(…, { multiline: true })`, `cwd` `cutUtf8(…, 4096)`, every rule line one-line `visibleText`. A cut in any of the three sets `truncated` and disables both allow choices. | SCD8, SD9, D11 |
| K6 | Detail per harness. Claude Code (BR5.1): `tool_input.command` when a string, else `tool_input.file_path` when a string, else `JSON.stringify(tool_input, null, 2)`; `cwd` from the hook input. opencode (BR5.2): `properties.metadata.command` when a string, else `properties.patterns` joined by `\n` when a non-empty array of strings, else refuse; `what` is `properties.permission`; request id `properties.requestID`, session `properties.sessionID`; `cwd` null. | BR5.1, BR5.2, NFR2.6 |
| K7 | Fixtures are built from the harness docs (functional-spec.md harness facts), not recorded, as u1 did (u1 K14): `tests/fixtures/agent-events/claude/permission-*.json` and `opencode/permission-*.json`. The opencode field names (`requestID`, `permission`, `patterns`, `always`, `metadata.command`) and the Claude Code suggestion shapes are provisional. The manual run on the release Mac (NFR2.5) saves the real payloads before the release pull request; they replace or confirm these fixtures, and the adapter follows. The fixtures README says so. | the NFR Design review R-05 gate cannot be met inside Code Generation; the failure direction is safe (no Allow always, or a hand-back) |
| K8 | The input guard stays u1's one `GUARD_MS = 400` for every page, as the brief asks ("like u1's AgentDialog fix"). PD8 designed 500 ms for permission pages. **This is shorter than the design's number and needs the person's word at Plan Approval**; if they keep 500, Step 22 adds `PERMISSION_GUARD_MS = 500` for permission pages only and the tests use it. For permission pages the guard also covers Esc (the `<dialog>` `onCancel`) and restarts when the window gains focus (`window` `focus` event), as review R-03 asks. | brief; NFR Design review R-03; stage rule: a design target is never relaxed silently |
| K9 | Keyboard on a permission page (NFR6.5): a digit only focuses that choice; Enter on a focused, enabled choice sends it (handled on `keydown` with `preventDefault`, so the native click does not send twice); Enter on the title sends nothing; ↑/↓ and Tab move between choices; Esc hands back. During the guard every `keydown`, `pointerdown` and click on the page is swallowed. | PD8, BR5.6 |
| K10 | Close, Esc and the time-out timer during `sending` change nothing: u1's `close` already answers `dismissed` outside `shown`/`timedOut`, and the timer fires only on `shown`. The renderer closes the window and calls no `close`. `sendPermission`'s own outcome decides the state (sent, back to `shown`, or `timedOut`). | NFR Design review R-04 (u2 design review minor 4) |
| K11 | A handed-back permission goes `handedBack`, then `ended` at once (BR5.10). The 5 s "Handed back to the terminal. Answer there as usual." line is a notice in `App.jsx` (`data-testid="app-notice"`, `role="status"`), set from AgentDialog's Close when `close` answers `handedBack` for a permission. `ponytail:` one notice at a time, no app-wide toast component; replace it with u5's notice if one is built. An opencode terminal answer and a tab exit keep the event `ended` for u1's 3 s with `endedBy: 'terminal'` or `'session'`, so the page can say "Answered in the terminal." or "Nothing was sent." | BR5.10, BR5.11, PD9 |
| K12 | Which events a newer event ends, by kind (SCD6): a new event of any kind ends the session's older open questions (u1 BR2.2) and its `timedOut` permissions, never a permission in `shown` or `sending`. An `answered` event without a `toolCallId` ends questions only; with one it ends the matching event of either kind. | SCD6, BR5.9, BR5.11 |
| K13 | Pager order in one place: new `src/shared/agentOrder.js` exports `byPager(a, b)` with `[rank, arrivedAtMs, tabId, seq]`, rank 0 for `question` and `permission`, 1 for `reply`. The store's `list()` and `App.jsx`'s cross-project sort both use it. u3 is not in this worktree, so a reply is tested with a plain `kind: 'reply'` object. | SCD9, BR5.12, AC2.1.4 |
| K14 | `formatLog` in `agentChannel.js` passes the 80-character excerpt through `visibleText` after its existing cut and line-break replacement, so ESC and bidi characters appear as `\u…` escapes in every log line, question and permission alike. The permission log lines never carry `alwaysRules`, rule lines or the secret, and `effect=` only on failure lines. | OD7, SD9 |
| K15 | The channel's "too large but secret matched" hand-back (u1 review fix 3) covers `permission` as well as `question`: one `WAITING = new Set(['question', 'permission'])` in `agentChannel.js`, reused by the store's refusal hand-back. | RD11, BR5.4 |
| K16 | The fallback-project case of BR5.4 needs no new code: a channel session, and so a permission event, exists only when the project's hooks are current (u1 K4); without one, AgentChannel refuses the file as from an unknown session and the hook ends by its own rules. A test pins it. | BR2.7, BR5.4 |
| K17 | The opencode plugin's wait task is shared by both kinds: `waitForAnswer(ctx, env, f, deliver)` takes the deliver function. `deliverPermission` replies only when the answer file is exactly `once`, `always` or `reject` and no `permission.replied` came for that `requestID`; missing or failing `reply` renames `.took` to `.nack`. The plugin never calls `ctx.permission.hook`. `ponytail:` a terminal answer landing between the replied check and `reply` still races; opencode applies the first decision it gets, and the plugin cannot close that window (RD13, review R-06). | RD13, SD8, D9 |
| K18 | The app never takes OS focus for a permission: no code in `agentPermissions.js`, `agentEvents.js` or `agentIpc.js` calls `focus`, `show` or `moveTop`. A source test pins it. | SD8 |
| K19 | The development hook entry is pasted by hand, as in u1 (u1 K13): `PermissionRequest`, matcher `*`, `timeout 600`, u1's command with `permission`. This plan does not write `.claude/settings.json`. | C6 is U4's; engine-owned file |
| K20 | Contract and record amendments named by the design are applied in Step 2: C3's `permission` block gains `truncated`, `choices[].effect` and `choices[].enabled` (`alwaysRules` stays out of C3); C4 notes that a permission answer is only `via: hook`; C1's `entry_timeout` names the permission entry (600 s); u2 `functional-design/rules.md` BR5.3 gets the Q1 A wording. `security-design.md` SD9's sentence "`visibleText` is exported from `src/main/agentAdapters.js`" is superseded by u5 amendment 2 and left as a reviewed record. | logical-components.md "Amendments for Code Generation"; contract ownership rules (additive only) |

## Files

| Path | New or changed | Component |
|---|---|---|
| `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` | changed: C1 entry timeout, C3 additive fields, C4 `via` note | C1, C3, C4 |
| `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/rules.md` | changed: BR5.3 wording (Q1 A) | BR5.3 |
| `tests/fixtures/agent-events/claude/permission-*.json`, `tests/fixtures/agent-events/opencode/permission-*.json`, `tests/fixtures/agent-events/README.md` | new fixtures; README gains the permission note | K7 |
| `src/main/agentAdapters.js` | changed: `parse('permission', …)` for both harnesses, `answered` reads `requestID`, `permissionAnswer(ev, choice, alwaysRules)`, `DENY_MESSAGE` | LC3 |
| `.thadeus/hooks/dialog.sh` | changed: `question \| permission) waits=1` and the header comment | LC8 |
| `src/main/agentChannel.js` | changed: `WAITING` set for the too-large hand-back; `formatLog` escapes the excerpt | LC2 |
| `.opencode/plugins/thadeus-dialog.js` | changed: `permission.asked`, `permission.replied`, `deliverPermission`, the `replied` set | LC9 |
| `src/main/agentPermissions.js` | new | LC4 (permission part) |
| `src/main/agentEvents.js` | changed: dispatch by kind, end rule by kind (K12), `byPager`, `permission` in `view()`, refusal hand-back for both waiting kinds | LC4 |
| `src/shared/agentOrder.js` | new: `byPager` | SCD9 |
| `src/main/agentTiming.js` | changed: `agentConfirmed` among the main stamps | LC7 |
| `src/main/agentIpc.js` | changed: `checkAnswer` accepts exactly `{ permission: { choice } }` | LC6 |
| `src/renderer/AgentDialog.jsx` | changed: `PermissionPage`, title and kind for permissions, guard on Esc and on window focus, Close notice | LC10 |
| `src/renderer/App.jsx` | changed: `byPager` sort, the 5 s notice | LC10 |
| `src/renderer/theme.css` | changed: amber permission header, monospaced `detail` block (`pre-wrap`, `overflow-wrap: anywhere`), coral edge on the refusing choice, the notice | BR5.13 |
| `src/shared/locales/sv.json`, `en.json` | changed: `agentDialog.kind.permission`, `agentDialog.title.permission`, `agentDialog.permission.*` | NFR7.3 |
| `vitest.config.mjs` | changed: per-file 80% glob for `src/shared/agentOrder.js` (`src/main/agent*.js` already covers `agentPermissions.js`) | NFR8.2 |
| `tests/main/agentPermissionAdapter.test.js`, `tests/main/agentPermissions.test.js`, `tests/main/agentOrder.test.js`, `tests/helpers/agentFakes.js` | new | tests |
| `tests/main/dialogScript.test.js`, `agentChannel.test.js`, `agentChannelScript.test.js`, `opencodePlugin.test.js`, `agentTiming.test.js`, `agentIpc.test.js`, `tests/renderer/AgentDialog.test.jsx`, `tests/renderer/AppShell.test.jsx` | changed: permission cases added | tests |

Not changed: `src/preload/index.js` (C4 gains no member), `src/main/ipc.js` (the store builds the permission part itself), `src/main/pty.js`, `src/main/index.js`, `src/shared/agentText.js`, `eslint.config.mjs`. u1's `tests/main/agentEvents.test.js` keeps its own fakes; the new helper serves the u2 store tests only.

This Unit is built in its own worktree with u1 and without u3. Nothing here imports u3 code or assumes a `reply` adapter.

## Steps

### Setup

- [x] Step 1: Project structure and production configuration skeleton. No new dependency and no new language (tech-stack-decisions.md). Create the empty `src/main/agentPermissions.js` and `src/shared/agentOrder.js` only in their Green steps, not now. Confirm `tests/main/dialogScript.test.js` is still the only entry in `vitest.config.mjs`'s `TIMED` list, so the permission script cases added to it run in the `scripts` project. (NFR8.5)
- [x] Step 2: Contract and record amendments (K20). In `contract-summary.md`: C1 `entry_timeout` reads "600 s for the question and permission entries, 10 s for answered (C6)"; C3's `permission` block gains `truncated: boolean`, `choices: [ { label, effect: "allowOnce" | "allowAlways" | "deny", refuses, enabled } ]`, with a note that `alwaysRules` never leaves main and `Answer.permission` takes no key but `choice`; C4 `agentEvents.answer` notes that a permission answer is only `via: hook` (D10). In u2 `functional-design/rules.md`, replace BR5.3's opencode clause and its Claude Code label clause with the wording of logical-components.md "BR5.3 amendment". (C1, C3, C4; BR5.3; Q1 A)
- [x] Step 3: Verify the existing runner and record the unit-scoped command. Run `npx vitest run tests/main/agentAdapters.test.js` (green on the u1 base) and record it in `unit-test-instructions.md` as the command runnable before the first Red. Run `npx vitest run tests/` and `npx vitest run tests/ --coverage` once on the unchanged tree and record the pass count and project line coverage for `code-summary.md`. Write the fixtures (K7): `claude/permission-bash.json` (Bash `git push`, with one `addRules` suggestion), `permission-bash-dirs.json` (`addRules` plus `addDirectories`), `permission-edit.json` (Edit, `file_path`, no suggestions), `permission-empty-suggestions.json` (`[]`), `permission-setmode.json`, `permission-deny-rule.json` (`addRules` with `behavior: "deny"`), `permission-extra-key.json`, `permission-question-tool.json` (`tool_name: "AskUserQuestion"`), `permission-no-tool.json`, `permission-input-string.json`, `permission-unicode.json` (Swedish, plain emoji, emoji with U+FE0F, non-ASCII path); `opencode/permission-asked-always.json`, `permission-asked-no-always.json`, `permission-asked-empty-always.json`, `permission-asked-bad-always.json` (a number in the array), `permission-asked-no-request.json`, `permission-asked-no-session.json`, `permission-replied.json`. Extend `tests/fixtures/agent-events/README.md` with K7's note. Write `tests/helpers/agentFakes.js` (`fakeChannel()` and `fakePty()` with the C2 members plus `answerState`, `retract`, `isLive`; the pty fake records `write` calls so tests can assert none). (AC2.1.1, AC2.1.2; NFR2.4, NFR8.5)

### Layer: harness adapters (`src/main/agentAdapters.js`, LC3; business logic, pure)

- [x] Step 4: Red. Write `tests/main/agentPermissionAdapter.test.js` against the fixtures:
  - Claude Code `parse('permission', …)` gives `what`, `detail` (command, `file_path`, or indented JSON), `cwd`, the choices Allow once, Allow always, Deny in that order with `refuses` only on Deny, and `alwaysRules` equal to the parsed `permission_suggestions` (BR5.1, BR5.3, NFR2.7, RD15).
  - Allow always offered for `permission-bash` and `permission-bash-dirs` only; not for no suggestions, `[]`, `setMode`, `behavior: "deny"`, an extra key, an empty `toolName`, an empty directory string (SD11, K4, R-05).
  - Rule lines: `<destination>: <toolName>(<ruleContent>)`, `<destination>: <toolName>`, `<destination>: <directory>`; a newline inside a rule shows as `\u000a`, so one rule never looks like two.
  - Caps (code points): 8 lines offered, 9 disabled; 1 024 characters offered, 1 025 disabled; a 257-character line disabled; a disabled choice's label holds no rule text (SD11, SCD8).
  - opencode `parse('permission', …)`: `what` from `permission`, `detail` from `metadata.command` or `patterns`, `toolCallId` = `requestID`; Allow once, Allow always (one line `<permission>: <pattern>` per pattern), Reject when `always` is a non-empty string array; Allow once and Reject only when it is missing, empty or holds a number (Q1 A, SD11).
  - One refusal with a reason per malformed shape: Claude Code without `tool_name`, with `tool_input` a string, not JSON; opencode without `requestID`, without `sessionID`; `AskUserQuestion` is refused with the reason `question tool` (NFR2.6, BR5.4, RD11).
  - Escapes (SD9): one table test over U+0000, U+001B, U+007F, U+0085, U+009F, U+00AD, U+061C, U+180E, U+200B, U+200D, U+200F, U+202A, U+202E, U+2028, U+2029, U+2060, U+2064, U+2066, U+2069, U+FEFF, U+E0001, U+E0041, U+E007F and a lone U+D800 (each built with `String.fromCodePoint` or a `\u` escape, never a raw character in the test source) in `what`, `detail`, `cwd` and a rule line: each shows as its escape; `\n` and `\t` stay in `detail` and are escaped elsewhere.
  - Bounds (SCD8): `detail` at 65 536 bytes unchanged with allows enabled; 65 537 cut, `truncated`, both allows disabled; a 4-byte emoji at byte 65 534 not split; `what` at 200 and 201 code points (the 201st half of a pair); `cwd` at 4 096 and 4 097 bytes; Deny always enabled.
  - `permission-unicode.json`: every field equals the payload (NFR7.4, PD10).
  - Replay, one per choice per harness (NFR2.4, RD15): Claude Code allow once is exactly `{ hookSpecificOutput: { hookEventName: "PermissionRequest", decision: { behavior: "allow" } } }`; allow always adds `updatedPermissions` deep-equal to (and the same parsed value as) the recorded suggestions; deny is exactly `{ behavior: "deny", interrupt: true, message: DENY_MESSAGE }` with no command text in it (SD12); no output has `updatedInput`; opencode gives `once`, `always`, `reject`.
  - `answered` for opencode reads `properties.requestID` (and still `formID`).
  - A 64 KB mixed-text `detail` builds in under 50 ms (PD7 smoke bound).

  Run `npx vitest run tests/main/agentPermissionAdapter.test.js` and record the failing output. (AC2.1.1, AC2.1.2; BR5.1–BR5.5; NFR2.4, NFR2.6, NFR2.7, NFR3.16–NFR3.18, NFR5.24, NFR7.4)
- [x] Step 5: Green. In `src/main/agentAdapters.js` add `parse('permission', body)` to `claude` and `opencode`, `permissionAnswer(ev, choiceIndex, alwaysRules)` to both, and the exported constant `DENY_MESSAGE = 'The person denied this in the app.'`. Import `visibleText` from `../shared/agentText.js` and `t` from `../shared/i18n.js`. Doc comments name `US-0506 u2 BR5.1–BR5.5, BR5.8, SD9, SD11, SD12`; the K3 and K4 `ponytail:` comments go on the label builder and the suggestion check. Run the Step 4 command, then `npx vitest run tests/main/agentAdapters.test.js`: green.
- [x] Step 6: Refactor with the Step 4 command green: one `capLines(lines)` for both harnesses' Allow always, one `capText` for the three fields, and the question code of u1 untouched.

### Layer: hook script (`.thadeus/hooks/dialog.sh`, LC8; file protocol, writer side)

- [x] Step 7: Red. Add a `describe('permission argument')` block to `tests/main/dialogScript.test.js`, reusing its `session`, `heartbeat`, `run` and `SHELLS` helpers; every case runs per shell, spawns the shell explicitly and asserts exit 0 and 0 bytes on stdout and stderr unless an answer is printed (RD14):
  - the exact C6 command with `permission` through `sh -c`, 20 runs each with `THADEUS_SESSION_DIR` unset and with the script folder deleted, each ≤ 100 ms (NFR4.4, PD11);
  - folder or `alive` missing: nothing written (NFR4.5);
  - a dropped `.ans` holding a Claude Code allow output is printed byte for byte within 300 ms, and no `.wait` or `.took` is left (PD7, NFR1.9);
  - an empty `.ans` prints nothing within 300 ms (NFR5.13, NFR5.17);
  - `alive` stops changing: exit 2.0–2.5 s after the last update (NFR5.14, RD12);
  - `THADEUS_WAIT_SECONDS=2`: exit 1.0–3.2 s (NFR5.15);
  - `events/` not writable; `answers/` missing (the dash case of u1 review R-01) (NFR4.5, SD14);
  - a payload with `$(touch marker)`, backticks and both quotes arrives byte for byte and `marker` does not exist (u1 NFR3.8);
  - two `permission` processes started together in one folder give two `.evt` files and two `.wait` markers with different names (SCD7, NFR5.22).

  Run `npx vitest run tests/main/dialogScript.test.js` and record the failing output (the script exits at once for `permission`, so the waiting cases fail). (AC2.1.3; NFR4.4, NFR4.5, NFR5.13–NFR5.15, NFR5.17, NFR5.22, NFR8.5)
- [x] Step 8: Green. Change the `case` line of `.thadeus/hooks/dialog.sh` to `question | permission) waits=1 ;;` and the header comment's kinds list; add no redirect and no other line (RD14). Name `US-0506 u2 RD14` in the comment. Run the Step 7 command: green under `sh`, and under `dash` where installed.
- [x] Step 9: Refactor with the Step 7 command green: check the script still meets u1's per-poll list (SCD4) and "no `[[`, `$RANDOM`, arrays, `local`, `ERR` trap, redirect on `:`"; nothing else changes.

### Layer: channel and file protocol (`src/main/agentChannel.js`, LC2; data access)

- [x] Step 10: Red.
  - In `tests/main/agentChannel.test.js`: a `permission` event file over 1 MB whose secret matches gets the empty hand-back answer, and one with a wrong secret gets none (K15, RD11); a log line for a refused event whose text holds ESC and U+202E shows `\u001b` and `‮`, and is still at most 80 characters inside `text="…"` (K14, OD7); a `permission` file for an unknown session is refused and nothing is emitted (K16).
  - In `tests/main/agentChannelScript.test.js` (integration, per shell): the real `dialog.sh permission` with the session env gives one raw event whose body equals stdin, and `writeAnswer` makes the script print it and exit (W1 steps 2–6); after three permission round trips in one session (an allow, an empty hand-back, a time-out with `THADEUS_WAIT_SECONDS=1`) the folder holds only `alive`, an empty `events/` and an empty `answers/` (SCD10).

  Run `npx vitest run tests/main/agentChannel.test.js tests/main/agentChannelScript.test.js` and record the failing output. (AC2.1.1, AC2.1.3; BR1.1, BR5.4; NFR3.20, NFR5.13; SCD10)
- [x] Step 11: Green. In `src/main/agentChannel.js` export `WAITING = new Set(['question', 'permission'])` and use it for the too-large hand-back; make `formatLog` pass the excerpt through `visibleText` after its cut (K14). Comment names `US-0506 u2 RD11, OD7`. Run the Step 10 command: green.
- [x] Step 12: Refactor with the Step 10 command green (none expected beyond the import).

### Layer: opencode plugin (`.opencode/plugins/thadeus-dialog.js`, LC9)

- [x] Step 13: Red. Add a `describe('permissions')` block to `tests/main/opencodePlugin.test.js`; the `load()` stub gains `ctx.permission = { reply, hook }` (both spies; `reply: null` leaves it out):
  - `permission.asked` writes a C1 `permission` event (header, then the event JSON unchanged) and a `.wait` marker before the rename (RD13);
  - an answer file `once`, `always` or `reject` gives exactly one `reply({ sessionID, requestID, decision })` with that decision, and `.took` and `.wait` are removed (NFR2.4);
  - answer files `''`, `'allow'`, `'once\n'` and `'ALWAYS'` give no `reply` (SD8);
  - `permission.replied` before the answer file: no `reply`; after it: one `reply`; each `permission.replied` writes an `answered` event with the `requestID` (NFR5.19, BR5.11);
  - replied during reply: the stubbed `reply` fires the `permission.replied` handler and then rejects; `reply` was called once, nothing was thrown, `.nack` and the `answered` event exist (RD13, review R-06);
  - `reply` rejecting, and `reply` missing: `.nack`, nothing thrown; an `fs` error on the event write is logged, nothing thrown (NFR5.19);
  - three `permission.asked` in the same ms get three names and wait at once (SCD7);
  - `ctx.permission.hook` is never called, and the plugin source contains no `evaluate` string (SD8, NFR3.13);
  - no `console.*` call on the four quiet paths (OD8).

  Run `npx vitest run tests/main/opencodePlugin.test.js` and record the failing output. (AC2.1.1, AC2.1.2; NFR3.13, NFR5.19, NFR8.6)
- [x] Step 14: Green. In `.opencode/plugins/thadeus-dialog.js` subscribe to `permission.asked` (`onPermission`) and `permission.replied` (adds the `requestID` to the `replied` set, then `onAnswered`); `waitForAnswer` takes the deliver function (K17); write `deliverPermission` with the `DECISIONS` set and the K17 `ponytail:` comment. The header names `US-0506 u2 BR5.2, BR5.11, RD13, SD8`. Run the Step 13 command: green.
- [x] Step 15: Refactor with the Step 13 command green: one handler wrapper (`try`/`catch`, own async task) for the four subscriptions.

### Layer: event store and permission delivery (`src/main/agentPermissions.js`, `src/main/agentEvents.js`, `src/shared/agentOrder.js`, `src/main/agentTiming.js`; LC4, LC7)

- [x] Step 16: Red.
  - Write `tests/main/agentOrder.test.js`: `byPager` puts `question` and `permission` (rank 0) before `reply` (rank 1) whatever the arrival, then `arrivedAtMs`, `tabId`, `seq`; equal `mtimeMs` with names in another string order follow `seq` (SCD9, SCD7, BR5.12).
  - Write `tests/main/agentPermissions.test.js` against `createAgentEventStore` with `tests/helpers/agentFakes.js`, the real adapters and fake timers:
    - Arrival: a Claude Code permission is listed `shown` with `permission` and no `alwaysRules`, and `agent-events:changed` is pushed in the same call (AC2.1.1, PD7); serialised `list()` and every push hold no `alwaysRules` or `permission_suggestions` key (a sentinel string planted in a suggestion never appears), and each choice has only `label`, `effect`, `refuses`, `enabled` (SD11, NFR3.17).
    - Hand-back on arrival (RD11, NFR5.13): adapter refusal and the question tool each call `writeAnswer` with `''` before the emit returns, push nothing, and log one line (`adapter refused: …`, `handed back: question tool`).
    - The answer check (SD10, NFR3.15), one test per row: unknown event; state `sending`, `sent`, `timedOut`, `handedBack`, `ended`; a second answer; session ended; hook no longer waiting (`.wait` gone: refused with `event not open`, state `timedOut`, `lastError` set); choice not an integer, outside `choices`, disabled; a key besides `permission` or besides `choice`; a question-shaped answer. In each, `writeAnswer` is never called and no hook output is built. Two `answer` calls in the same tick give one `sending` and one `event not open`.
    - Delivery (RD10), one test per row with `writeSession` never called: taken → `sent`, `via: 'hook'`, `answerDelivered` stamped; `.nack` → `timedOut` "the agent refused the answer"; `.wait` gone with `.ans` still there → retract, `timedOut`; folder gone during the poll → `timedOut`, never `sent` (SD14 R-04); nothing within the window and retract succeeds → back to `shown` with `lastError` while the hook waits, else `timedOut`; retract `ENOENT` → `sent`. The window is 1 000 ms for Claude Code and 5 000 ms for opencode. `writeAnswer` throwing `EACCES` while `.wait` exists: `shown`, `lastError`, a second Send succeeds; while it is gone: `timedOut` (NFR5.20). The hook exits at the wait limit and the `.ans` appears just after: `timedOut`, never `sent` (NFR5.16).
    - Never on its own (SD8, NFR3.13, NFR3.19): arrival, the time-out timer, Close, Esc, tab exit and a start-up with leftover folders call `writeAnswer` only with `''` or not at all, and the pty fake's `write` is never called in any state (`queued` through `ended`) or RD10 outcome; a source test that `agentPermissions.js` has no `pty`, `writeSession`, `tapOutput` or `sendViaKeys` reference and that `handBack` takes the event only; a source test that `agentPermissions.js`, `agentEvents.js` and `agentIpc.js` contain no `.focus(`, `.show(` or `moveTop` (K18).
    - Time-out (BR5.9, NFR5.15): at `waitSeconds` a `shown` permission is `timedOut`, every choice `enabled: false`, no write; a `sending` permission is left to its delivery (K10).
    - Close and Esc (BR5.10, NFR5.17): on `shown`, the empty answer file, then `handedBack` and `ended` at once, `close` answers `handedBack`; on `timedOut`, no write, `ended`; during `sending`, `dismissed`, no write, and the later delivery outcome still shows (K10, review R-04).
    - opencode `answered` (PD9, NFR1.11, BR5.11): for a `shown` permission it ends with `endedBy: 'terminal'` and the push runs before the call returns; for a `sending` or `sent` one it ends with one `agentConfirmed` stamp; a later `.nack` changes nothing visible; Claude Code and a terminal answer never stamp `agentConfirmed` (OD6).
    - Several per session (SCD6, NFR5.21): three permissions within 100 ms are three pages; answering the second writes only the second's answer file; a question arriving after them leaves all three open; a newer event ends a `timedOut` permission and no other; an `answered` without `toolCallId` ends no permission (K12).
    - Tab exit (NFR5.18): three permissions in different states and `endSession`: all `ended` with `endedBy: 'session'`, no write after.
    - Order: a permission arriving after an open question and before a `kind: 'reply'` stand-in sorts by `byPager` (AC2.1.4).
    - Logs (OD7, OD8): one `[agent-events]` line per refused answer, per failed send (`send failed: <cause>`, with `effect=` only on the `.nack` line), none on the four quiet paths; no secret, no rule line.
    - The `alwaysRules` map is empty after every event has ended (SCD10).
  - In `tests/main/agentTiming.test.js`: `agentConfirmed` is accepted from main and refused from the renderer; one Claude Code permission with the switch on gives four lines with exactly `{ eventId, harness, stamp, at }` and no command text or effect (OD5, OD6).

  Run `npx vitest run tests/main/agentOrder.test.js tests/main/agentPermissions.test.js tests/main/agentTiming.test.js` and record the failing output. Then run `npx vitest run tests/main/agentEvents.test.js` to confirm u1's store tests are still green before the Green step. (AC2.1.1–AC2.1.4; BR5.4, BR5.6–BR5.12; NFR1.11, NFR1.12, NFR1.13, NFR3.13, NFR3.15, NFR3.17, NFR3.19–NFR3.21, NFR5.13, NFR5.15–NFR5.18, NFR5.20, NFR5.21, NFR5.23)
- [x] Step 17: Green.
  - `src/shared/agentOrder.js`: `byPager` (K13); header `US-0506 u2 SCD9, BR5.12`.
  - `src/main/agentPermissions.js` (K1, K2): `add` (end rule of K12, timer, push, `hookReceived`), `answer` (SD10 order, `sending` before the first `await`), `sendPermission` (RD10, with the `windowMs` per harness and the RD10 `ponytail:` comment on the SIGKILL gap between take and print), `handBack(ev)` (empty file only while `hookWaits`), `close`, `answered`, `timeout`, and the private `alwaysRules` map. Header `US-0506 u2 BR5.4, BR5.6–BR5.11, SD8, SD10, SD11, SD13, RD10–RD12`.
  - `src/main/agentEvents.js`: `onRaw` dispatches `permission` to the module and hands back a refused event of either `WAITING` kind; `addQuestion` ends older questions and `timedOut` permissions only (K12); `answered` without `toolCallId` ends questions only; `move()` keeps `endedBy: 'terminal'` for 3 s like `'session'` (K11); `list()` sorts with `byPager`; `PUBLIC` gains `permission`; `answer` and `close` route by kind.
  - `src/main/agentTiming.js`: `agentConfirmed` in `MAIN_STAMPS`.

  Run the Step 16 commands: green, `tests/main/agentEvents.test.js` included.
- [x] Step 18: Refactor with the Step 16 commands green: the RD10 outcome table as one `outcome(st)` function; no state change outside `move()`.

### Layer: IPC (`src/main/agentIpc.js`, LC6; API)

- [x] Step 19: Red. In `tests/main/agentIpc.test.js`: `agentEvents:answer` passes `{ permission: { choice: 1 } }` to the store; it refuses before the store sees it a non-integer or negative `choice`, `{ permission: { choice: 0, extra: 1 } }`, `{ permission: { choice: 0 }, question: … }` and an over-64-character `eventId` with `doesNotFit` or `unknownEvent` (SD10 shape half); the question shape still passes as before. Run `npx vitest run tests/main/agentIpc.test.js` and record the failing output. (NFR3.15; C4)
- [x] Step 20: Green. In `checkAnswer`, accept exactly one top-level key, `question` (as today) or `permission`, and for `permission` exactly the key `choice` with a non-negative integer. Doc comment names `US-0506 u2 SD10`. Run the Step 19 command: green.
- [x] Step 21: Refactor with the Step 19 command green: one `onlyKeys(obj, keys)` check for both shapes.

### Layer: AgentDialog permission page (`src/renderer/AgentDialog.jsx`, `src/renderer/App.jsx`, LC10; frontend)

- [x] Step 22: Red. Add a `describe('AgentDialog: permission pages')` block to `tests/renderer/AgentDialog.test.jsx` (Swedish locale, the existing `show()` helper and faked `Date`), with a `permissionEvent(fixture, over)` builder:
  - M3 layout (BR5.13, NFR6.6, AC2.1.1): the word for PERMISSION and "<harness> ber om behörighet" in the header, project and context line, `what`, `detail` as a text node inside the monospaced `agent-dialog-detail` block, `cwd` when given, choices in the agent's order with number keys, the refusing choice after a rule with `is-refusing` and named in its label.
  - Plain text (SD9, NFR3.16): a `detail` with `<script>`, `<img onerror=…>`, a Markdown link, ANSI codes and U+202E renders no `script`, `img` or `a` element and shows each as text.
  - Allow always (SD11): the button's text equals the label, each rule line is visible, the button has no ellipsis style; a disabled Allow always that is not truncated shows the "Too long to show here" line.
  - Nothing preselected (NFR3.14, NFR6.4, PD8): `document.activeElement` is the page title; no choice has `aria-selected`, `aria-pressed` or `autofocus`; Enter on the title after the guard sends nothing.
  - Guard (PD8, K8): `1` then Enter at 0, 100 and 399 ms, and a click at 200 ms, call no `agentEvents.answer` and focus no choice; Esc inside the guard closes nothing; after `GUARD_MS` `1` then Enter calls `answer(eventId, { permission: { choice: 0 } })` once; paging to a second permission restarts the guard; a window `focus` event restarts it.
  - Keyboard alone (NFR6.5, K9): each of the three choices sent with key events only; a digit alone focuses and never sends; ↓ moves focus; Esc after the guard calls `agentEvents.close` only.
  - States (NFR6.6): `sending`; `sent` "Skickat till Claude Code."; `timedOut` with the M6 line and every choice disabled, Open the terminal and Close working (AC2.1.3, BR5.9); failed with `lastError` and the choice still enabled; `ended` with `endedBy: 'terminal'` "Besvarad i terminalen."; `ended` by session "Inget skickades."; `truncated` with both allow buttons `disabled` and Deny, Close and Open the terminal working (SCD8, BR5.5); opencode shows "Also open in the terminal".
  - Close during `sending` calls no `agentEvents.close` (K10); Close on a `shown` permission whose `close` answers `handedBack` calls the `onNotice` prop with the hand-back line (K11).
  - Paging: a permission arriving while a question page is shown leaves the page and shows "+1 ny" (BR2.1, SCD9).
  - Timing: with `stamp`, `answerClicked` is sent before `answer` in the same tick (NFR1.12).
  - In `tests/renderer/AppShell.test.jsx`: events from two projects, a `kind: 'reply'` stand-in from tab A that arrived first and a permission from tab B, reach the dialog with the permission first (AC2.1.4, K13); the notice shows for 5 s and then goes (K11).

  Run `npx vitest run tests/renderer/AgentDialog.test.jsx tests/renderer/AppShell.test.jsx` and record the failing output. (AC2.1.1–AC2.1.4; BR5.5, BR5.6, BR5.9, BR5.10, BR5.13; NFR3.14, NFR3.16, NFR6.4–NFR6.6, NFR7.3)
- [x] Step 23: Green.
  - `src/renderer/AgentDialog.jsx`: `PermissionPage` with `data-testid` values `agent-dialog-permission`, `agent-dialog-what`, `agent-dialog-detail`, `agent-dialog-cwd`, `agent-dialog-permission-choice` (with `data-effect`), `agent-dialog-permission-note`; the title `agentDialog.kind.permission` and `agentDialog.title.permission` (with BR4.6's still-waiting form); for permission pages `onCancel` and every key and click swallowed while guarded, and the guard restarted on window `focus` (K8, K9); `closeDialog` skips `close` during `sending` and calls `onNotice` after a `handedBack` (K10, K11). Header comment gains `US-0506 u2 BR5.5, BR5.6, BR5.13, PD8, SD9`.
  - `src/renderer/App.jsx`: sort with `byPager` (K13); the notice state with a 5 s timer and the `K11` `ponytail:` comment.
  - `src/renderer/theme.css`: the amber header, the monospaced `detail` block (`white-space: pre-wrap; overflow-wrap: anywhere`, its own scroll), `is-refusing` with the coral edge, the labels with `pre-wrap` and no `text-overflow`, the notice.
  - `sv.json` and `en.json`, same keys and ICU placeholders: `agentDialog.kind.permission`, `agentDialog.title.permission` `{harness}`, `agentDialog.title.permissionStillWaiting` `{harness}`, `agentDialog.permission.allowOnce`, `allowAlways` `{rules}`, `allowAlwaysBare`, `deny`, `reject`, `cwd` `{cwd}`, `truncated`, `alwaysTooLong`, `timedOut` `{harness}`, `handedBack`, `answeredInTerminal`.

  Run the Step 22 command, then `npx vitest run tests/main/i18nKeys.test.js`: green.
- [x] Step 24: Refactor with the Step 22 command green: the permission keyboard handler as one function beside u1's, no Swedish or English literal in the file (the i18nKeys check), u1's question page unchanged.

### Environment, build and verification

- [x] Step 25: Environment and build configuration. Add `'src/shared/agentOrder.js': { lines: 80 }` to the thresholds in `vitest.config.mjs`; no threshold is lowered and no file excluded. Run `npx eslint .` and `npx prettier --check .` and fix the new code. Run this Unit's coverage command from `unit-test-instructions.md` on its own line. Then run the Construction Verification Command `npx vitest run tests/ --coverage && npx eslint . && npx prettier --check .`: it passes, and the test count is Step 3's count plus the new tests. Record the counts and the per-file coverage for `code-summary.md`. (NFR8.1–NFR8.6)
- [x] Step 26: Development hook entry (K19). Put the Claude Code `PermissionRequest` entry into `unit-test-instructions.md` and `code-summary.md` for the person to paste beside u1's two entries; opencode needs nothing more (the same plugin file). The manual runs (NFR1.8–NFR1.10, NFR2.5: three choices on each harness, the deny run confirming `interrupt: true`, the Allow always runs confirming what was saved, a quit while a permission waits, plain `claude` outside the app) are left to Build and Test and the release check, with the fixture replacement of K7.

### Documentation and traceability

- [x] Step 27: Documentation and traceability. Check that `docs/FEATURES.md` and `docs/features/epic-05-workflow-control.md` still show US-0506 as "🚧 in progress, for v0.2.5"; leave them unchanged and mark nothing done. Check that every new module and exported function names its story and requirement IDs (`US-0506 u2 …`), every new `data-testid` is kebab-case `<component>-<role>`, every user-facing text goes through `t()`, and each `ponytail:` comment names its ceiling (K3 language switch, K4 unknown suggestion keys, K11 one notice, K17 the reply race, RD10's SIGKILL gap). `code-summary.md`, `source-manifest.json` and `traceability.json` follow in Step 5 of the stage.

## Story and requirement traceability

| Plan steps | Story / criteria | Rules and NFRs |
|---|---|---|
| 1–3 | US2.1 (fixtures, contracts) | C1, C3, C4; BR5.3 (Q1 A); NFR2.4, NFR8.5 |
| 4–6 | AC2.1.1, AC2.1.2 | BR5.1–BR5.5, BR5.8; NFR2.4, NFR2.6, NFR2.7, NFR3.16–NFR3.18, NFR5.24, NFR7.4; SD9, SD11, SD12, SCD8, RD15, PD7 |
| 7–9 | AC2.1.3 | NFR4.4, NFR4.5, NFR5.13–NFR5.15, NFR5.17, NFR5.22, NFR8.5; RD14, PD11, SCD7, SD14 |
| 10–12 | AC2.1.1, AC2.1.3 | BR1.1, BR5.4; NFR3.20, NFR5.13; RD11, OD7, SCD10 |
| 13–15 | AC2.1.1, AC2.1.2 | BR5.2, BR5.11; NFR3.13, NFR5.19, NFR8.6; RD13, SD8, D9 |
| 16–18 | AC2.1.1–AC2.1.4 | BR5.4, BR5.6–BR5.12; NFR1.11–NFR1.13, NFR3.13, NFR3.15, NFR3.17, NFR3.19–NFR3.21, NFR5.13, NFR5.15–NFR5.18, NFR5.20, NFR5.21, NFR5.23; SD8, SD10, SD11, SD13, RD10–RD12, PD9, SCD6, SCD9, SCD10, OD5–OD8 |
| 19–21 | AC2.1.2 | NFR3.15; SD10; C4 |
| 22–24 | AC2.1.1–AC2.1.4 | BR5.5, BR5.6, BR5.9, BR5.10, BR5.13; NFR3.14, NFR3.16, NFR6.4–NFR6.6, NFR7.3; PD8, PD10, SD9 |
| 25 | US2.1 Definition of Done | NFR8.1–NFR8.6; OD9 |
| 26, Build and Test | AC2.1.1, AC2.1.2 manual | NFR1.8–NFR1.10, NFR2.5; D8 |
| 27 | US-0506 feature docs | project Mandated rules |

## Open risks

1. **Input guard 400 ms against PD8's 500 ms** (K8). The brief asks for u1's 400 ms; the design says 500. The person settles it at Plan Approval; the plan is ready for either.
2. **Fixtures are built from the docs, not recorded** (K7). The opencode field names (`requestID`, `always`, `metadata.command`) and the Claude Code suggestion shapes may differ from the real 2.1.4 and 2.1.325 payloads. A wrong guess fails safe (no Allow always, or a hand-back), but the manual run must save the real payloads before the release pull request.
3. **`ctx.permission.reply` and `ctx.event.on('permission.asked', …)` are assumed** from opencode's docs, like u1's form API (u1 deviation 8). Only the manual opencode run proves them.
4. **Deny with `interrupt: true`** stops the turn only if Claude Code honours it in `PermissionRequest` output (D8); confirmed by the manual deny run.
5. **Merge with u3.** u3 is built beside this Unit and also changes `agentEvents.js`, `AgentDialog.jsx`, `App.jsx`, the locale files and `contract-summary.md`. B2 merges first (bolt plan); keeping permission logic in its own module (K1) and the order in `agentOrder.js` (K13) narrows the overlap, but u3 must adopt `byPager` and the K12 end rule.
6. **Timing in CI.** The permission script cases add about 12 timed cases per shell to the `scripts` project, with u1's slack. A flaky run is surfaced, never solved by widening a window.
7. **The 5 s hand-back notice lives in `App.jsx`** (K11), not in a toast component the app does not have; if u5 builds one, the notice moves there.
8. **Error texts are worded for questions** (`agentDialog.errors.eventNotOpen` says "The question is no longer open."). They are reused for permissions as C4's named errors; rewording them neutrally would change u1's tested texts and is left for the person to ask for.
