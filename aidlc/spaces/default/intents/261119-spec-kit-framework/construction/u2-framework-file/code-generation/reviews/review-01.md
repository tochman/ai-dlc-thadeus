## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-20T04:31:57Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | src/main/projectFile.js > readProjectFile / inspect (`kindOf` then `readCapped`) | The read checks `.thadeus/` and the file with `lstat`, then opens the file with `O_NOFOLLOW`. `O_NOFOLLOW` covers only the last path component, so a swap of `.thadeus/` for a symlink between the check and the open is not caught on the read side. The write side records this gap in a `ponytail:` comment. The read side does not. The read is capped at 64 KiB and parsed only with `JSON.parse`, so the impact is a bounded read of a file the person already cloned. | Add a one-line `ponytail:` comment on `readCapped` or `inspect` that names the same ceiling, so the shortcut is recorded on both paths. | New |
| R-02 | Minor | src/main/projectService.js > detectProject | `detectProject` now reads `.thadeus/project.json` on every call (open and every re-detect), where before it only did folder listings. The plan explains the move from the two `ipc.js` callers to this one place (code-generation-plan.md "One change of place"). Each read is two `lstat` calls plus a read of at most 64 KiB, which is cheap. The cost grows if watcher-driven re-detects fire often. | None required. Check at Build and Test that watcher-driven re-detection does not call `detectProject` in a hot loop. | New |
| R-03 | Minor | src/main/projectService.js > savedReason | When the file is ok and the saved framework is found, but `chooseFramework` returns a source other than `file`, the reason is "saved framework not found". Today `source` is `file` whenever the saved framework is found, so this holds. The code relies on that coupling with no test naming it. | Optional: add a test that a saved framework found in the project always gives `source: 'file'` with no reason, so a later change to `chooseFramework` cannot silently turn it into a false "not found" message. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npx vitest run --project main tests/main/projectFile.test.js tests/main/projectService.test.js` | PASS: 2 files, 40 tests passed | The unit's tests pass on the current tree. |
| `npx eslint` on the four changed JS files | PASS: no output | Clean. |
| `npx prettier --check` on the four JS files and both locale files | PASS: all files use Prettier code style | Clean. |

### Summary

The implementation matches the rules in rules.md (BR1.1 to BR2.6): read classification order, `1e400` handling, spread-based key keeping, atomic write with `expect` rechecks, and detection fallback with reasons. The `saved` option is removed in favour of one read inside `detectProject`. The three findings are minor and none blocks approval.
