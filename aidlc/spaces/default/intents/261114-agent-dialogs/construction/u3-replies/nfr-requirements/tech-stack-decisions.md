# Tech Stack Decisions: u3-replies

## Sources

- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md` (installed versions)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR3, NFR8; FR4.6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/functional-spec.md` (harness facts: Claude Code 2.1.325 `Stop` with `last_assistant_message`, opencode 2.1.4 `session.status` and `ctx.session.context`; Stop entry `timeout 10`; typed delivery)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/rules.md` (BR6.1, BR6.2, BR6.3, BR6.11, BR6.12, BR6.16)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/reviews/review-01.md` (R-01, R-02)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1, C2 guarded `writeSession`, C6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/tech-stack-decisions.md` (D1–D6, reused by id)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/reviews/review-01.md` (R-02, R-03, R-07)

## Summary

No new dependency and no new language. Replies use u1's stack as u1 D1–D6 set it: the same `dialog.sh` with one more argument, the same plugin file, the existing `writeSession` and the existing `FileContent` Markdown rendering.

| Part | Choice | Version | New? |
|---|---|---|---|
| Stop hook | `reply` branch of `.thadeus/hooks/dialog.sh`, POSIX `sh` | system | no (u1 script) |
| opencode idle handler | in `thadeus-dialog.js`, plugin API V2 (as u1 D4) | opencode 2.1.4 | no (u1 plugin) |
| Reply parsing, store, LatestMessage | JavaScript ES modules in main, Node built-ins | Electron 45.3.1 / Node 22 | no |
| Typed delivery | existing `writeSession(id, data)` from `src/main/pty.js`, through the one guarded caller in AgentEventStore (C2) | node-pty 1.1.0 | no |
| Reply page and LatestMessageStrip | React, `react-markdown` + `remark-gfm` through `FileContent` | 19.3.1; 10.1.0, 4.0.1 | no |
| Tests | vitest, Testing Library, `sh` and `dash` for script tests | 5.1.0, 16.3.3 | no |

## Corrections from the u1 review this Unit depends on

These are u1 NFR review findings on the shared script and channel. NFR Design settles them once for all kinds; this Unit states where it relies on them.

| u1 finding | What u3 relies on | u3 rows |
|---|---|---|
| R-03: dash has no ERR trap | the script starts with `exec 2>/dev/null` and every fallible step ends in `\|\| exit 0`, so the `reply` branch is silent even when a write fails | NFR4.7, NFR4.8 |
| R-07: tests only under CI's dash | each script test runs `sh dialog.sh` and also `dash dialog.sh` where `dash` exists | NFR4.5, NFR4.7, NFR8.5 |
| R-02 (b): names are `<epoch-s>-<pid>.evt` | arrival order is `mtimeMs` then a main-side counter, never the name | NFR5.18 |

u1 R-01 (liveness) and R-02 (a) (`THADEUS_WAIT_SECONDS`) do not touch replies: the `reply` branch never waits.

## Decisions

### D7 The reply branch writes and exits; it shares the script, not the wait

- **Context:** BR6.1 and C1 say a reply never waits. Claude Code's Stop entry has a 10 s timeout, and a Stop hook's output or exit code 2 can make Claude continue.
- **Decision:** `dialog.sh reply` runs u1's header and copy steps (existence tests, `date +%s`, `printf` header with kind `reply`, `cat` stdin, `mv` to `.evt`) and then `exit 0`. It never enters the poll loop, never reads `answers/`, prints nothing.
- **Alternatives rejected:** a second script `reply.sh` (two scripts to install, version and keep silent; u4 tracks one file); an `async: true` hook entry (adds a harness feature the u1 spike did not check; the plain branch is already fast enough by NFR4.5).
- **Consequences:** u1's script tests cover the shared steps; the `reply` branch adds one argument case. The 10 s timeout is never close (NFR4.5).
- **Security:** same as u1 D3 and NFR3.8: stdin is never parsed.

### D8 The reply text comes from the payload only; the 1 MB file limit stays

- **Context:** Claude Code's Stop stdin carries `last_assistant_message`, and the docs advise it over reading `transcript_path`. The script copies stdin unchanged and must not parse JSON (C1, R-01 of Domain Design), so it cannot cut a long message before the 1 MB file limit.
- **Decision:** the adapter reads only `last_assistant_message` (Claude Code) or the context result's text parts (opencode) and never opens the transcript (NFR3.17). A payload over 1 048 576 bytes is refused by u1's rule, logged, and shows nothing (NFR5.23).
- **Alternatives rejected:** reading the transcript (a second source that can disagree with the payload, and a file read outside the session folder); cutting stdin with `head -c` in the script (breaks the JSON, so the adapter would refuse it anyway); raising `max_bytes` (C1 belongs to u1 and bounds every kind).
- **Consequences:** a last message above about 1 MB shows no reply; the person reads it in the terminal. This differs from FR6.2's "cut at 64 KB" only above 1 MB, and is recorded as a known limit for the gate.
- **Security:** no read outside the session folder.

### D9 The opencode idle handler reads the context in a task it does not await

- **Context:** BR6.2 needs the last assistant message, read with `ctx.session.context({ sessionID })`, which is async. The handler must not hold opencode (NFR4.6).
- **Decision:** the `session.status` handler checks `status.type === 'idle'` and that the session has no parent, starts the read and the file write as one promise chain with its own `catch`, and returns without awaiting it.
- **Alternatives rejected:** awaiting the read in the handler (opencode waits on the plugin); forwarding the status event without the message and reading it in main (main has no opencode client, and the app would need opencode's server mode, which it does not use).
- **Consequences:** a read that never resolves leaks one pending promise per idle event; accepted, as each idle event is a finished turn. `ponytail:` comment in code, upgrade with a timeout if a hang is ever seen.
- **Security:** the plugin writes only into `THADEUS_SESSION_DIR`, as u1.

### D10 The typed answer is cleaned with one regular expression pair and written with the existing `writeSession`

- **Context:** BR6.11 and NFR3.14 need every `Cc` character gone. BR6.12 needs the write to the asking pty only, in one step.
- **Decision:** clean with `text.replace(/[\r\n\t]/g, ' ').replace(/\p{Cc}/gu, '')`, then write through the guarded `writeSession` caller (C2) synchronously after the re-check. Whether Enter goes in the same write or as a second write after a short gap is set by the NFR2.5 check (u3 FD review R-02) and recorded in NFR Design.
- **Alternatives rejected:** a sanitising library (a new dependency for two lines); bracketed paste around the text (depends on each TUI's paste mode, and NFR3.14 already removes the escape that could end it).
- **Consequences:** emoji, quotes and non-ASCII pass unchanged; the answer is always one line.
- **Security:** the escape character can never reach the pty from an answer.

### D11 The strip renders through the existing `FileContent`

- **Context:** BR6.16 needs one line of inline Markdown, sanitized as BR4.1.
- **Decision:** pass the first non-empty line to `FileContent` in an inline mode that maps block elements to inline ones, and cut it with CSS `text-overflow: ellipsis`.
- **Alternatives rejected:** stripping Markdown to plain text (loses inline code and emphasis that FR2.8 asks for); a second Markdown renderer (two sanitizing paths to keep safe).
- **Consequences:** one sanitizing path for dialog and strip (NFR3.13).
- **Security:** raw HTML is skipped as in u1 NFR3.5.

## Quality gates (NFR8)

u1 NFR8.1–NFR8.4 apply unchanged to this Unit's files. Replies add:

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR8.5 | The `reply` branch of the script has its own tests, run under both shells (u1 NFR review R-07). | `tests/main/` spawns `sh dialog.sh reply` for every NFR4.4, NFR4.5, NFR4.7 and NFR4.8 case, and repeats each with `dash` when `dash` is on `PATH`; the test fails if `sh` and `dash` give different output or exit status | The suite in CI (`ubuntu-latest`, where `sh` is `dash`) and locally on the release Mac before the release pull request |
| NFR8.6 | The plugin's idle handler and the scenario (7) replays have their own tests. | plugin tests for every NFR4.6 and NFR5.13 case with a stubbed V2 `ctx`; the two NFR2.4 replay tests use recorded payloads committed under `tests/` | The suite in CI; the full `npx vitest run tests/` green before merge |
| NFR8.7 | Coverage of this Unit's touched files. | ≥ 80% line coverage for the new and changed files (adapter reply parsing, store reply and LatestMessage code, the strip, the reply page, the plugin's idle handler), measured by `@vitest/coverage-v8` as u1 NFR8.2 | CI `verify` job fails below the floor |
