# Security Requirements: u2-framework-file (US-1408)

Sources: `requirements.md` (NFR1, NFR3, NFR8, FR2), `functional-spec.md` (W1, W2), `rules.md` (BR1.1–BR2.6), `contract-summary.md` (C2), `codekb/aidlc-dash/technology-stack.md`.

U2 is a library Unit: it reads and writes one file, `.thadeus/project.json`, inside a project root the person opened. It has no IPC channel, no network and no CLI of its own. The threat is a cloned repository whose file content or folder layout is hostile.

## Threats

| # | Threat | Control |
|---|---|---|
| T1 | A symlinked `.thadeus/` or `project.json` points outside the root, so a write lands elsewhere | NFR3.1 |
| T2 | A hostile file (huge, deeply nested, not JSON, a prototype-polluting key) breaks the open | NFR3.2, NFR3.3 |
| T3 | A write is interrupted and leaves a half file | NFR3.4 |
| T4 | The app writes into `.specify/` or `specs/` | NFR3.5 |
| T5 | A read writes, or a write runs without the person's confirmation | NFR3.6 |

## Requirements

| ID | Requirement | Pass/fail check |
|---|---|---|
| NFR3.1 | The path is the fixed `.thadeus/project.json` joined to the opened root. `fs.lstat` on `.thadeus/` and on the file refuses either one when it is a symlink, or not a folder and a regular file (BR1.1). A missing one is not an error. `resolveInRoot` is not used: it needs the path to exist and follows symlinks that stay inside the root. | Test: a symlinked folder and a symlinked file each give `unreadable` on read and `writeFailed` on write, and nothing outside the root changes. |
| NFR3.2 | A file over 64 KiB is not parsed and reads as `unreadable`. | Test with a 65 KiB file. |
| NFR3.3 | Parsing uses `JSON.parse` only, never `eval` or a `require`. Kept keys are copied from the parsed object, and `__proto__`, `constructor` and `prototype` keys are dropped before the rewrite. | Test: a file with `__proto__` is rewritten without it, and `Object.prototype` is unchanged. |
| NFR3.4 | The write goes through the existing `writeAtomic` (`fileWrite.js`): a temp file in `.thadeus/`, then a rename. On failure the temp file is removed and the old file stays (BR2.6). | Test: a failing rename leaves the old bytes and no temp file. |
| NFR3.5 | The module writes only `.thadeus/project.json`, never in `.specify/` or `specs/`. | Covered by the NFR3 no-write test the epic adds, with U2's read and detect paths in it. |
| NFR3.6 | Read and detection never write. The write is exported only for U4 and U8, which call it after a confirmed preview (BR2.1). | Test: reading every file state leaves the folder byte-identical. |
| NFR1.1 | The fallback reasons (BR1.3, BR1.4) and write errors are `t()` keys present in `sv.json` and `en.json`. File content is never put in a message, only the file name and the reason code. | `i18nKeys.test.js` green; a test that a hostile `framework` value does not appear in the reason text. |
| NFR8.1 | Tests first, 80% line coverage on the new module, ESLint, Prettier and gitleaks green. | CI. |

No secrets are stored in the file; it holds only `version` and `framework`.

## Not applicable to this Unit

NFR2 (no view), NFR4 (no CLI), NFR5 (no Spec Kit file read), NFR6 (no harness logic) and NFR7 (no watcher) belong to other Units. See `traceability.json`.
