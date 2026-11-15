# Tech Stack Decisions: u1-questions

## Sources

- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md` (installed versions)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR8; FR4.6: the script needs only what macOS and Linux provide)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/practices-discovery/team-practices.md` (TDD, 80% line coverage with `@vitest/coverage-v8`, ESLint and Prettier in CI, no TypeScript)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/delivery-planning/bolt-plan.md` (Bolt 1 step 1 sets up the quality gates)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/decisions.md` (ADR-001 file channel, ADR-004 script folder)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 file names and alive file, C6 entries)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md` (spike: Claude Code 2.1.325, opencode 2.1.4 plugin API V2)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/nfr-requirements-questions.md`
- `.github/workflows/release.yml` (the `verify` job runs on `ubuntu-latest`)

## Summary

No new dependency. The Unit uses the app's own stack plus plain `sh` for the hook script and opencode's plugin API V2 for the plugin.

| Part | Choice | Version | New? |
|---|---|---|---|
| Main: AgentChannel, HarnessEventAdapter, AgentEventStore | JavaScript ES modules, Node built-ins (`fs`, `crypto`, `path`) | Electron 45.3.1 / Node 22 | no |
| Session folder watching | `chokidar` | 4.0.3 | no |
| Dialog | React, `react-markdown` + `remark-gfm` through the existing `FileContent` | 19.3.1; 10.1.0, 4.0.1 | no |
| Texts | i18next with ICU | 27.1.1 | no |
| Hook script `.thadeus/hooks/dialog.sh` | POSIX `sh` with `cat`, `mv`, `rm`, `date`, `sleep`, `[` | system | no |
| opencode plugin | JavaScript ES module against plugin API V2 (`Plugin.define`) | opencode 2.1.4 | no |
| Tests | vitest (`main` and `renderer` projects), Testing Library | 5.1.0, 16.3.3 | no |
| Coverage, lint, format (NFR8) | `@vitest/coverage-v8`, ESLint, Prettier | added in Bolt 1 step 1 | yes, as dev tools already decided by the team |

## Decisions

### D1 Liveness by content change, not by `stat`

- **Context:** BR1.2 needs the script to know that `alive` is older than 2 s. `stat` takes different flags on macOS (`-f %m`) and Linux (`-c %Y`), and `date +%s` has only second precision, too coarse for a 2 s rule.
- **Decision:** the app rewrites `alive` every 500 ms with the current epoch ms (so its mtime still changes, as C1 says). The script reads it each poll and treats the app as gone after 2 s by wall clock with no change in content (NFR5.1).
- **Alternatives rejected:** `stat` with a per-OS branch (two code paths to test, breaks on BSD-like Linux userlands); `find -newer` against a reference file (an extra file and process per poll).
- **Consequences:** one `cat` of a tiny file per poll; portable; detection is 2.0–2.5 s after the last update.
- **Security:** none; the file holds a timestamp only.

### D2 The wait deadline uses the wall clock

- **Context:** counting polls drifts: each poll takes 100 ms plus process time, so 5 950 polls can last past Claude Code's 600 s timeout, and then Claude Code discards the output.
- **Decision:** the script reads `date +%s` at start and exits when `now − start ≥ THADEUS_WAIT_SECONDS`. `THADEUS_WAIT_SECONDS` is 595, the full wait with the 5 s margin already applied by main (NFR5.2).
- **Alternatives rejected:** poll counting (drift above); `timeout(1)` around the loop (not on macOS by default).
- **Consequences:** exit within one second of 595 s, well inside 600 s.
- **Security:** none.

### D3 Event file names from `date +%s` and the pid

- **Context:** POSIX `sh` on macOS has no millisecond clock and no `$RANDOM`; the functional spec's `<ms>-<pid>-<rand>` cannot be built portably. C1 names `<epoch-ms>-<pid>.evt`.
- **Decision:** the script names the file `<epoch-s>-<pid>.evt`. Two waiting hooks in one session cannot exist (BR2.2), and pids differ between running processes, so names do not collide. `arrivedAt` and the timing log's `hookReceived` come from the file's `mtimeMs` read in main (NFR1.6). AgentChannel accepts names matching `^\d+-\d+\.evt$` (NFR3.9).
- **Alternatives rejected:** reading `/dev/urandom` through `od` for a random part (more processes for no gain); a Node helper (FR4.6 forbids needing Node).
- **Consequences:** C1's name shape (`<digits>-<digits>.evt`) is kept; only the meaning of the first number changes from ms to s, which no consumer relies on.
- **Security:** names are validated before use as paths (NFR3.9).

### D4 The opencode plugin is JavaScript, not TypeScript

- **Context:** the functional spec's spike table names `.opencode/plugins/thadeus-dialog.ts`; contract C6 names `thadeus-dialog.js`. opencode loads both. The repository has no TypeScript, and ESLint and Prettier (NFR8.3) are set up for JavaScript.
- **Decision:** write the plugin as `thadeus-dialog.js`, an ES module. The final path stays u4's call (C6).
- **Alternatives rejected:** TypeScript (a second language, a type-check setup the team has not chosen).
- **Consequences:** vitest imports the plugin directly in tests with a stubbed V2 `ctx` (NFR5.7).
- **Security:** none.

### D5 Watch the session folders with `chokidar`, without write-finish polling

- **Context:** NFR1.1 needs the file noticed quickly. Event files appear by rename, so they are complete when they appear.
- **Decision:** one `chokidar` watcher on the channel root, `ignoreInitial: true`, no `awaitWriteFinish`; `.tmp` files are ignored and only `.evt` adds are handled.
- **Alternatives rejected:** `fs.watch` directly (the app already uses `chokidar` in `watcher.js`); polling (adds latency).
- **Consequences:** no added delay from the watcher's settle timer.
- **Security:** files are still checked by BR1.1 (NFR3.3) whatever the watcher reports.

### D6 Quality gates (NFR8)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR8.1 | New behaviour is built test first (team TDD). | each behaviour's failing test is committed or shown before its code in the Code Generation plan steps | Code Generation plan review; PR history |
| NFR8.2 | Line coverage of the touched code. | ≥ 80% line coverage for the Unit's new and changed files, measured by `@vitest/coverage-v8` | CI `verify` job fails below the floor |
| NFR8.3 | Lint and format. | ESLint and Prettier report 0 errors | CI `verify` job; a failure blocks the merge |
| NFR8.4 | The hook script and the plugin have their own tests. | `tests/main/` holds tests that spawn `sh dialog.sh` for every NFR4 and NFR5 script case, and tests that load the plugin with a stubbed `ctx` | The suite in CI; the full `npx vitest run tests/` green before merge |

The script tests need `sh`, `cat`, `date` and `sleep`. The CI `verify` job runs on `ubuntu-latest`, where `sh` is `dash`; on the release Mac `sh` is bash in POSIX mode. So the suite runs the script under `dash` in CI and under macOS `sh` when run locally on the release Mac before the release pull request, and the script uses only features both share (no `$RANDOM`, no `[[`, no arrays, fractional `sleep` from the system `sleep` binary).
