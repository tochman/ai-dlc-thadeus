# Decisions: Release v0.2.13

All Accepted, 2026-11-20. Answers in `domain-design-questions.md`.

## ADR-001: The Features Loader reads main's planning through git (US-0036)
- **Context**: On a story branch the views show the branch's old markers. FR2.1 wants `origin/<docs branch or main>` without changing the checkout, with the branch's own story blocks on top. [Q1]
- **Decision**: `features.js` gets a source: when the checkout is not the target, each planning file is read with `git show <ref>:<path>` (GitReader), falling back to the local target with no remote or before the first fetch; the result names its ref. Planning Sync drops a queued doc entry older than the read branch's with nothing newer (FR2.3).
- **Consequences**: + One loader and one result shape for the renderer; nothing is written. − Each load runs a few `git show` calls (fixed arguments, timeout); hashes sent back for writes must be the target's, not the disk's.
- **Alternatives Rejected**: a separate Planning Reader module (a second loader for the same shape); reading in the planning worktree (it exists only while an action runs).
- **Security**: read-only; refs and paths come from settings and the loader's own list (`safeArg`).

## ADR-002: A new ThadeusSync with a shared record (US-0609)
- **Context**: `.thadeus/` changes far more often than the docs (token readings), and must never land in a story commit (FR3.4). FR3.1 and FR3.8 tie it to US-0608's record and the planning waiting list. [Q2, Q8]
- **Decision**: A new module `thadeusSync.js` with its own scheduler and cycle. Its entries are a new kind in Planning Record's file; it reuses Planning Sync's worktree, rebase and push helpers, which are exported for it. The harness files are one table (Claude Code, opencode). One `chore: sync .thadeus` commit per push; token logs merge by reading time on a rebase.
- **Consequences**: + Its batching and schedule do not slow or complicate the planning cycle; one record, so one waiting count. − Two cycles can push to the same target: they must run through the same per-root serial queue; Planning Record's validation grows a kind.
- **Alternatives Rejected**: extending Planning Sync's cycle (one cycle, but the docs and token-log rhythms would be mixed); a separate record and scheduler sharing only git (two waiting counts, duplicated push code).
- **Security**: only paths under `.thadeus/` and the table's harness files are staged; a `.thadeus` link out of the root is refused, as today.

## ADR-003: The committed harness file is main's version with only the app's spans changed (US-0609 FR3.2)
- **Context**: The person may have their own edits in `.claude/settings.json` or the opencode plugin. [Q3]
- **Decision**: The Agent Hooks Installer's splicer builds the committed text from `main`'s version of the file; the person's other edits stay in the working tree and are named.
- **Consequences**: + The app never commits the person's edits. − The splicer must work on text it did not read from disk; a span it cannot find is reported, not guessed.
- **Alternatives Rejected**: committing the whole file only when it has no other edits (a busy file would never sync).
- **Security**: no secret in a settings file reaches a commit unless it is already on `main`.

## ADR-004: Parked state from `aidlc --status` on load and the audit events live (US-0510)
- **Context**: AI-DLC records parking only as `WORKFLOW_PARKED` / `WORKFLOW_UNPARKED` audit events; the mark must follow an agent's park live (FR4.6). [Q4, Q7]
- **Decision**: A new `intentPark.js` runs park, unpark and the intent switch with fixed arguments through ExecRunner, and asks `aidlc --status` on load. Between loads, Project Service reads the last park event per intent from the audit, which the intents watcher already follows.
- **Consequences**: + AI-DLC's own answer on load; live without polling. − Two sources can disagree for a moment; the newer one wins. Whether `--status` answers for an intent that is not active is checked in Code Generation; the audit covers those intents either way.
- **Alternatives Rejected**: the audit alone (Q4 A); running `--status` on every audit change (a CLI call per write burst); load-only (an agent's park would not show).
- **Security**: fixed arguments only, never `--help` (it runs the command); an intent name must match the intent list before `aidlc intent <name>` runs (NFR4).

## ADR-005: A `useFold` hook with shared classes, state in the app settings (US-0415)
- **Context**: Every list view gets the same toggle; the state is per view, the same in every project, across restarts (FR5.3). [Q6, Q9]
- **Decision**: `useFold(viewId)` plus shared LCARS classes; each view places its toggle and strip. The state is `listFolded` in `userData/settings.json`, through the bridge; `sanitize` keeps only known view ids.
- **Consequences**: + Views keep their own layout; settings already survive restarts and are the same in every project. − Each view wires its own toggle, so a test per view checks it is there with `aria-expanded` and its name.
- **Alternatives Rejected**: a shared `ListColumn` wrapper (Q6 A, B); `localStorage` (Q9 B).
- **Security**: none beyond the settings sanitizer.

## ADR-006: The login PATH stays in the Exec Runner (US-0035)
- **Context**: A slow login shell made the app keep its own PATH for the whole session. Only one place reads it.
- **Decision**: `exec.js` keeps one in-flight read, gives the shell 20 s, does not keep a fallback, and offers `refresh()`; `tools.js` calls it on a scan and passes the fallback flag to the Tools row.
- **Consequences**: + One module pair changes. − A lookup during a slow shell waits up to 20 s (NFR5's longest limit).
- **Alternatives Rejected**: none viable: the PATH is read only here.
