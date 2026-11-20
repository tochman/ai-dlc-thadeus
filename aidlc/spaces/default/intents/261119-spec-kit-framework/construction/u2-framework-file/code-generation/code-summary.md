# Code Summary: U2 u2-framework-file (US-1408)

Branch `feat/US-1408`, from `feat/US-1401`. Nothing committed yet.

## Files

| File | Change |
|---|---|
| `src/main/projectFile.js` | New. `readProjectFile(root)`, `writeProjectFile(root, framework)`, `PROJECT_FILE`, `FRAMEWORKS` |
| `src/main/projectService.js` | `detectProject(root, { askWhenBoth })` reads the file itself; `saved` option removed; `savedReason()` builds BR1.3/BR1.4 reasons |
| `src/shared/locales/sv.json`, `en.json` | New `projectFile.*` keys (reasons, `unusable`, `savedNotFound`, `notPlain`, errors) |
| `tests/main/projectFile.test.js` | New, 27 tests on real temp folders |
| `tests/main/projectService.test.js` | `fixture()` writes the file for `saved`; the old `saved:` test replaced by 5 |
| `docs/features/epic-14-spec-kit.md`, `docs/FEATURES.md` | US-1408 ✅ Done, for v0.3.0 |

`src/main/ipc.js` is unchanged: open and re-detect both reach the file through `detectProject(root)`.

## Key decisions

- The read lives in `detectProject`, not in the two `ipc.js` callers (approved plan).
- Read: `lstat` on `.thadeus/` and the file, open with `O_NOFOLLOW`, at most 64 KiB + 1 byte, `JSON.parse` in `try`, BR1.2 order.
- Write: spread keeps every key (a `__proto__` key round-trips, `Object.prototype` untouched); `writeAtomic` with an `expect` that repeats both `lstat` checks; `ponytail:` comment on the race left inside the rename itself.
- `version: 1e400` parses to `Infinity`; it is treated as a newer version (refused, no number shown) rather than `invalid` and replaced, so a newer app's file is never overwritten.
- A broken file in a folder with neither framework gives both reasons, the file's first.

## Tests

- Unit command: 2 files, 40 tests, all pass (27 `projectFile`, 13 `projectService`). Baseline before the change: 9.
- `src/main/projectFile.js`: 98.21% lines, 98.3% branches, 100% functions (threshold 80%, unchanged). Uncovered: an `lstat` error other than ENOENT.
- `i18nKeys.test.js` 4 pass, `featureDocsStatus.test.js` 9 pass; ESLint and Prettier clean on changed files.
- Red outputs recorded for Steps 3, 5 and 8 (module missing; `writeProjectFile is not a function` ×12; 4 detection assertions).

## Not executed here

- The full suite and the project-wide 80% floor: Build and Test runs them.

## Deviations from the plan

- Extra tests: a file of exactly 64 KiB reads; an `unknownFramework` file is rewritten keeping its keys; a second symlink race moving `.thadeus/` away.
- `O_NOFOLLOW` on open, beyond the design.
- AC1.2.2's preview naming the file is U4's and U8's screen; U2 supplies the write and its `file` result.
