# Tech Stack Decisions: u2-permissions

## Sources

- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md` (installed versions)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR3, NFR8; FR3.4, FR4.6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1, C2 "Delivering an answer", C6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/functional-spec.md` (harness facts: Claude Code 2.1.325 `PermissionRequest`, opencode 2.1.4 `permission.asked` / `ctx.permission.reply`; open points)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/rules.md` (BR5.5, BR5.6, BR5.8, BR5.11)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/reviews/review-01.md` (R-02, R-05)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/tech-stack-decisions.md` (the shared base: summary table, D1–D6, NFR8.1–NFR8.4)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/reviews/review-01.md` (R-01, R-02, R-03, R-07)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/nfr-requirements-questions.md` (no questions)

## Summary

No new dependency and no new language. This Unit uses u1's stack table unchanged: the same `dialog.sh` with the argument `permission`, the same opencode plugin file with two more subscriptions, and the same main components.

| Part | Choice | New? |
|---|---|---|
| Claude Code entry | `PermissionRequest`, matcher for every tool, `timeout 600`, u1's command with `permission` (C6) | entry new; no new tool |
| opencode | `permission.asked`, `permission.replied`, `ctx.permission.reply` in `thadeus-dialog.js` (u1 D4) | subscriptions new |
| `detail` rendering | a React text node in a monospaced block, not `FileContent` | no |
| Character escaping (NFR3.16) | a small function in the adapter using a JavaScript regular expression with Unicode classes | no |

## Shared script: u1 review corrections this Unit depends on

These change the shared script and C1. They are designed in NFR Design; u2's targets assume them.

| Correction | u1 review | Where u2 depends on it |
|---|---|---|
| Liveness with `date +%s` (1 s): "gone" after 3 unchanged whole seconds, a real gap of at least 2 s | R-01 | NFR5.14 |
| `THADEUS_WAIT_SECONDS` is the full wait (595); C1's "minus 5 s" is amended to match | R-02 | NFR5.15 |
| Arrival order from `mtimeMs` and a main counter, never the file name; C1's file name first number is seconds | R-02 | NFR5.22 |
| Silent exit by `exec 2>/dev/null` and `\|\| exit 0`; no ERR trap (dash has none) | R-03 | NFR4.5 |
| Script tests run under `sh` and, where present, `dash` | R-07 | NFR8.5 |

## Decisions

### D7 Claude Code: `PermissionRequest`, not `PreToolUse`

- **Context:** FR3.4 forbids the app deciding. The hook must fire only when Claude Code would ask the person.
- **Decision:** use `PermissionRequest` with a matcher for every tool and `timeout 600`. It fires only when a tool call needs a decision, and Claude Code waits for it before showing its own prompt (FD harness facts).
- **Alternatives rejected:** `PreToolUse` with `permissionDecision` (fires for every tool call, also those already allowed by the person's rules, so the app would ask for, or decide, calls Claude Code never asks about); the `Notification` hook (cannot return a decision).
- **Consequences:** the entry runs on every permission prompt in every checkout that has the settings, so NFR4.4's 100 ms bound matters.
- **Security:** the app only answers prompts Claude Code itself raised.

### D8 Deny with `interrupt: true`

- **Context:** the terminal "No" stops the turn. A deny without `interrupt` lets the agent try another way, which is not what the person chose.
- **Decision:** deny returns `behavior: "deny"`, `interrupt: true` and a fixed English message (agent-facing, NFR7.3). `updatedInput` is never set.
- **Alternatives rejected:** deny without `interrupt` (differs from the terminal); agent text in the message (the agent would read its own words back).
- **Consequences:** a gate before Code Generation: the manual NFR2.5 deny run confirms the behaviour on the release Mac (FD open point, FD review R-05).
- **Security:** none beyond NFR3.18.

### D9 opencode: reply only from the answer file, never `evaluate`

- **Context:** opencode shows its own prompt at once and accepts a reply from either side. `ctx.permission.hook("evaluate")` would decide in code before anyone is asked.
- **Decision:** the plugin subscribes to `permission.asked` and `permission.replied` only. It calls `ctx.permission.reply` with the decision read from the answer file, once per `requestID`, and not after `permission.replied` came for it (NFR5.19). The `permission.asked` field names are read from recorded fixtures before the adapter is written (FD review R-05).
- **Alternatives rejected:** `evaluate` (the app deciding, FR3.4); replying without the replied check (two decisions for one request).
- **Consequences:** the plugin keeps a per-run set of replied `requestID`s; it ends with the opencode process.
- **Security:** NFR3.13.

### D10 Permission answers never as keys

- **Context:** C2 sends `via: keys` after a hand-back. For a permission a key in the wrong place allows something the person did not choose (W2).
- **Decision:** a permission answer is only `via: hook`. A timed-out permission is answered in the terminal. This narrows C2 for permissions (FD review R-02); U4 and U5 must not assume `keys` for permissions.
- **Alternatives rejected:** keys after time-out, as for questions (the risk above; the prompt's keys differ per tool and version).
- **Consequences:** u1 NFR1.3 does not apply; NFR3.19 checks it.
- **Security:** removes the only path where the app's input could land on a prompt the person did not see in the dialog.

### D11 `detail` as plain text, escaped in the adapter

- **Context:** a command can carry HTML, Markdown, ANSI codes and characters that reorder or hide text (NFR3.16).
- **Decision:** the adapter escapes control and format characters once; the dialog renders `detail` as a text node in a monospaced block. `FileContent` and `react-markdown` are not used for it.
- **Alternatives rejected:** Markdown with raw HTML off, as for questions (a command is not prose; Markdown would hide `*`, `_` and backticks); escaping in the renderer (the same rule in two places, and log lines would differ).
- **Consequences:** the cut at 64 KB happens before escaping, on the agent's own text, so the limit means the same as FR6.2.
- **Security:** NFR3.16.

## Quality gates (NFR8)

u1 NFR8.1–NFR8.3 (TDD, 80% line coverage of touched files with `@vitest/coverage-v8`, ESLint and Prettier with 0 errors in CI) apply unchanged to this Unit's new and changed files.

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR8.5 | The script tests cover the `permission` argument, under both shells. | every NFR4.4, NFR4.5, NFR5.13–NFR5.17 and NFR5.22 script case spawns `sh dialog.sh permission` and, when `dash` is on the path, `dash dialog.sh permission`; CI (`ubuntu-latest`) has `dash` | The suite in CI; run locally on the release Mac before the release pull request |
| NFR8.6 | The plugin's permission path has its own tests. | tests load `thadeus-dialog.js` with a stubbed V2 `ctx` covering `permission.asked`, `permission.replied` before and after the answer file, `reply` rejecting and missing, and no `evaluate` registration | The suite in CI; the full `npx vitest run tests/` green before merge |
