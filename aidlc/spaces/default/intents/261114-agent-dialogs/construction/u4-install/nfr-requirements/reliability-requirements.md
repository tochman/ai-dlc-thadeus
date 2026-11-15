# Reliability Requirements: u4-install

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR4, NFR5; FR4.3–FR4.7; Constraints: the app's entries must survive an AI-DLC reinstall or be detected as missing)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/functional-spec.md` (entry set, W2–W9, both state machines, apply sketch, Known limits)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/rules.md` (BR7.1–BR7.6, BR7.9–BR7.12, BR7.14–BR7.19)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/entities.md` (InstallPreview `state`, ApplyResult `outcome` and `refusal`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/reviews/review-01.md` (R-01 to R-04)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C4 `agentHooks.apply` errors, C5, C6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/reliability-requirements.md` (u1 NFR4.3, u1 NFR5.2) and `performance-requirements.md` (u1 NFR4.1, u1 NFR4.2)
- Existing code: `src/main/fileWrite.js` (`writeFileSafe` temp file and rename), `src/main/watcher.js` (`watchFiles`)

## What "reliable" means here

There is no service and no availability SLO. The installer's promise has two parts:

- **The project is never damaged.** Every file is either exactly as it was or exactly as the preview showed, and other people's entries never change.
- **The app's hooks never harm a session.** This holds whether the app's parts are complete, half-written, out of date or removed.

## No harm when the app is absent (NFR4)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR4.9 | Every entry the installer writes carries the C6 guard exactly, for all four kinds (BR7.2). u1 NFR4.1 tests the command string itself. This row tests that what lands in the file is that string. | for each of the 4 commands read back from the written file, run with `sh -c` and `CLAUDE_PROJECT_DIR` set: with `THADEUS_SESSION_DIR` unset, and again with it set but `.thadeus/hooks/dialog.sh` deleted, exit 0, 0 bytes on stdout and stderr, ≤ 100 ms, in each of 20 runs | Main test after a real Install into a temporary project |
| NFR4.10 | The installed script and plugin are the bytes u1–u3 tested (BR7.2, BR7.3). The same bytes give the same no-harm behaviour (u1 NFR4.1, u1 NFR4.2, u1 NFR4.3; the plugin registers nothing without `THADEUS_SESSION_DIR`). | sha256 of the written `dialog.sh` and `thadeus-dialog.js` equal the bundled files the u1–u3 script and plugin tests load | Digest test after Install, against the same imports those tests use |
| NFR4.11 | A teammate who pulls the install, with or without the app, keeps a working Claude Code. The settings file stays valid JSON, and every hook that is not the app's (AI-DLC's included) is unchanged and still runs. | the written file parses; every non-app value deep-equals the old one (NFR3.28); on the release Mac, after Install, a plain `claude` started in a terminal outside the app shows its own picker for a question at once, and AI-DLC's own hooks still write their ledger | Fixture test with this repository's own `.claude/settings.json` holding AI-DLC's hooks; manual run (NFR8.9) |

## Safe writes (NFR5)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR5.25 | Each file is written atomically (BR7.16). The bytes go to a temp file in the target's real folder, named `.<name>.<uuid>.tmp`, which is then renamed over the target. If a step fails, the temp file is removed and the original stays. | after an injected failure at the temp write (`ENOSPC`), at the rename (`EACCES`) and at the folder create (`EROFS`), the target's sha256 equals the pre-apply digest (or the file is still absent), and no `.tmp` file is left in the folder; at no time does a reader see a file shorter than either the old or the new bytes | Unit tests injecting each failure; a test that reads the target in a tight loop during 50 applies and sees only the old or the new digest |
| NFR5.26 | Files are written in a safe order, and a partial write is harmless and visible (BR7.16). Install and update write the script before the settings file. Remove changes the settings file before it deletes the script. | settings write failing after the script was written gives `partiallyWritten` naming `.claude/settings.json` and the cause in one sentence; status becomes `outOfDate` with Update; the entries are never present without the script except from outside the app (where the guard covers it, NFR4.9) | Unit test injecting a settings write failure on install, and a script delete failure on remove |
| NFR5.27 | Nothing is written over a change made after the preview (BR7.14, FR4.7). Every file is read again before the first write. Each file's digest is compared once more right before its own rename, with no `await` other than that read between the compare and the rename. | a file changed, created or deleted after the preview gives `changedSincePreview` naming it, 0 bytes written, and a new preview built from disk; the time from the last compare to the rename is ≤ 50 ms for a 1 MB file | Unit tests that change each file between preview and apply; a timing test on the 1 MB fixture |
| NFR5.28 | Install is idempotent. A second Install on an unchanged project changes nothing. Writing the same canonical content twice gives the same bytes. | after Install, a new Install preview lists every file with change `none` and offers no apply button (BR7.7); Install on two identical copies of a fixture gives sha256-equal files; the same holds for Update over an `outOfDate` fixture, whose result equals a fresh Install's | Fixture tests over the NFR8.8 set |
| NFR5.29 | Remove takes out the app's parts and only those (BR7.19). When nobody changed the file in between, Remove after Install returns it to its exact earlier bytes. | after Remove: no command in `.claude/settings.json` contains `.thadeus/hooks/`; `dialog.sh` and the plugin are gone; `.thadeus/hooks/` and `.thadeus/` are gone only when empty; the settings file is never deleted; for fixtures with no `hooks` key, or with other hooks under every event the app uses, the file is byte-identical to its pre-install bytes | Fixture round-trip tests (Install then Remove) over the NFR8.8 set. A file that held an empty `"hooks": {}` or an empty event array before Install is the one known non-round-trip: the app's removal empties it and removes it (BR7.19) |

## Correct status and clear outcomes (NFR5)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR5.30 | An entry's kind is read from its command by one fixed rule (resolves FD review R-03, BR7.1). The command must contain `.thadeus/hooks/dialog.sh`. After that text come at most one `"` and then one or more spaces. The kind is the run of characters `a`–`z` that follows, ending at whitespace, `;`, `"`, `'` or the end of the command. A kind outside `question`, `answered`, `permission`, `reply` is not the app's (U4 amendment, SD34). | canonical command → its kind; `dialog.sh question` (unquoted) → `question`; `dialog.sh" question;exit 0` → `question`; `dialog.sh" questionx; exit 0` → not the app's; `dialog.sh"` with no argument → not the app's; `other.sh question` in `.thadeus/hooks/` → not the app's; a command without `.thadeus/hooks/` → not the app's | One table-driven unit test with these rows |
| NFR5.31 | A file the app cannot use offers no action that would fail (resolves FD review R-02, BR7.12, BR7.15). When a file's status carries a `reason` (not valid JSON, unexpected shape, cannot read, outside the root), the M7 strip shows the reason sentence and Details only. Project settings shows the reason and no Install, Update or Remove for that harness. The status stays `missing` with `reason` (C4 unchanged). | for each reason case, 0 Install, Update or Remove buttons in M7 and in Project settings, the sentence present, and the harness on the fallback; fixing the file on disk brings the buttons back within NFR1.16's 1.5 s | Renderer tests per reason; main test: fix the file, status loses `reason` |
| NFR5.32 | Each apply outcome leaves one preview state (resolves FD review R-01). This table replaces the FD state machine's "changed since preview → refused" arrow. | `written` → `applied`; `nothingToChange` → `applied`; `refused: changedSincePreview` → `superseded`, and a new preview is built (W6); `refused: previewUnknown` → no state change (no open preview matched); `refused` for `invalidJson`, `unexpectedShape`, `cannotRead`, `cannotWrite`, `outsideRoot` → `refused`; `partiallyWritten` → `refused`, with Update offered from the recomputed status. Only `open` can be applied | One unit test per row; a test that no final state can be applied |
| NFR5.33 | The canonical entries match what u1–u3 built. The waiting kinds' timeout stays above the script's wait (u1 NFR5.2). | in the CanonicalRelease table: `question` and `permission` timeout 600 ≥ `THADEUS_WAIT_SECONDS` 595 + 5; `answered` and `reply` timeout 10; matchers `AskUserQuestion`, `AskUserQuestion`, `*`, none; events `PreToolUse`, `PostToolUse`, `PermissionRequest`, `Stop` | Unit test importing the table and the constant main passes as `THADEUS_WAIT_SECONDS` |
| NFR5.34 | Files and folders get modes that work everywhere, and the app adds no execute bit (BR7.2, BR7.11). | new `dialog.sh`, plugin and settings file are created with mode `0644` (`0644` under umask `022`); a modified file keeps its existing mode; missing folders are created with `0755` (under umask `022`), only the missing ones; `dialog.sh` is LF-only with no byte order mark | Unit tests: `fs.statSync(p).mode & 0o777` after create and after modify of a file set to `0600`; byte scan for `\r` and a BOM |
| NFR5.35 | Status follows disk, and the source choice follows status (BR7.17, BR7.18). | after any apply, and after any change on disk (NFR1.16), `isCurrent` equals the recomputed status; a tab spawned while not current stays on the fallback after a later Install until it is restarted; after Remove, tabs of that harness use the fallback from the next event on | Store tests with a fake installer: spawn before and after Install; Remove while a tab runs |

## Accepted limits, named for NFR Design

| Limit | Why it is accepted | NFR Design records |
|---|---|---|
| Concurrent-write window (FD review R-04). Between the last digest compare and the rename (≤ 50 ms, NFR5.27), another writer (AI-DLC, a pull) can still write the file, and the rename then replaces that write. | No portable file lock works across AI-DLC and git. The window is one read, one compare and one rename. The watcher recomputes status right after (NFR1.16), so a lost AI-DLC entry shows on AI-DLC's side and a lost app entry shows as `missing` or `outOfDate` here. | the window bound and the recovery path |
| Duplicate hooks from other Claude settings files (FD review R-04) | see `security-requirements.md`, accepted risk | the Claude Code deduplication check |
| No `fsync` before the rename | The editor's `writeFileSafe` does the same. The rename is atomic against a crash of the app. A power loss on a filesystem without rename ordering could leave an empty file, which the next status shows as `missing` or with a `reason` (NFR5.31). | `ponytail:` comment at the write naming this ceiling; add `fsync` if a real case appears |
| A temp file left by a hard crash between write and rename (`.claude/.settings.json.<uuid>.tmp`) can show up in `git status` | The window is milliseconds and the file is named as the app's. Cleaning it automatically would mean deleting files the app did not just write. | the name pattern, so a person can recognise it |
| Two files are not one transaction (FD Known limits) | NFR5.26 keeps the partial state harmless and visible | — |

## Recovery

| Failure | Recovery | Who acts |
|---|---|---|
| Write fails before any rename | original intact (NFR5.25); one sentence; fallback stays | the person retries after fixing the cause |
| Settings write fails after the script was written | `partiallyWritten`, status `outOfDate` (NFR5.26) | the person clicks Update |
| File changed since the preview | new preview shown (NFR5.27, NFR5.32) | the person decides again |
| Settings file unusable | reason shown, no action (NFR5.31) | the person fixes the file; status recovers by itself |
| AI-DLC reinstall drops the app's entries | status `outOfDate` or `missing` within 1.5 s (NFR1.16); fallback; strip with Update or Install | the person clicks |

No data needs backup: the app keeps no state of its own about the install (entities: recomputed from disk). Git holds the project's history.
