# Security Design: U9 u9-feature-token-log

Sources: `security-requirements.md` (NFR3.1–NFR3.6, NFR6.1–NFR6.2, NFR8.1, NFR1.1), `tech-stack-decisions.md`,
`functional-spec.md` (W1, the session cursor), and C8 in `contract-summary.md`. No question was needed: the NFR
answers settle every point.

There is no login, network call or secret. The design defends two edges: paths that arrive from hook events and
files, and writes leaving the token log.

## Path checks (where input enters)

| Input | Check | On failure | NFR |
|---|---|---|---|
| Stop event `transcriptPath` | `insideDir(path, ~/.claude/projects)` after `realpath`, so `..` and links out are refused | Skip the turn, log one console line, cursor kept | NFR3.2 |
| Feature folder from the C5 reader | Name matches `^\d{3}-[a-z0-9-]+$` and is not a reserved name (`project`, `cursor`) | Bucket `speckit-project` | NFR3.3 |
| `.thadeus` / `.thadeus/tokens` | `resolveInRoot(projectRoot, …)` on the resolved real path | Refuse the write, log, cursor kept | NFR3.4 |
| opencode usage event | Needs the message id and all four token counts | Ignore the event, never guess | NFR6.1 |

## Write boundary

One function builds every write path: `.thadeus/tokens/speckit-<key>.json`, with `<key>` already checked above.
Nothing else in U9 writes in the project, so nothing reaches `.specify/` or `specs/` (NFR3.1). Writes use the
existing `writeAtomic` (temp file, then rename); a crash leaves the old file whole.

## Counting once

- Claude: the cursor keeps, per session, each message id with its last counted usage. A call is credited by its
  increase only, so a call whose usage grows between turns is not counted twice (NFR6.2).
- opencode: the same per-message rule for a re-sent message (NFR6.2).
- First sight of a session: calls already in the transcript go to `speckit-project`; calls from the first seen turn
  on go to the active feature (NFR3.6).
- The cursor advances only after the bucket write succeeds (BR3.2), so a failed write is retried, never lost.

## Cursor store

A JSON file in `app.getPath('userData')`, keyed by project root and session id, written with `writeAtomic`. It holds
message ids and counts only, no message text (NFR3.5). It is machine-local and never committed or merged.

## Logging and text

Failures are single console lines naming the check and the path; no new user-facing text, so no new `t()` keys
(NFR1.1).

## Verification

Test first (NFR8.1). Tests: fs-write spy (NFR3.1); transcript outside, `..`, symlink out (NFR3.2); keys `../x`,
`project`, `001-login` (NFR3.3); symlinked `.thadeus` (NFR3.4); cursor file has no text fields (NFR3.5); 3 earlier
calls + 1 new (NFR3.6); full and id-less opencode event (NFR6.1); same id twice with growing counts (NFR6.2). The new
module and the plugin each hold 80% line coverage; ESLint, Prettier and gitleaks green.
