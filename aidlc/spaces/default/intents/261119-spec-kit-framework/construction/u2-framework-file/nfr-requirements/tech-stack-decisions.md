# Tech Stack Decisions: u2-framework-file (US-1408)

Sources: `codekb/aidlc-dash/technology-stack.md`, `functional-spec.md`, `rules.md`, `contract-summary.md` (C2), `requirements.md` (NFR3, NFR8).

Nothing new is added. U2 is one main-process module built from what the app already has.

| Decision | Choice | Why | Alternative rejected |
|---|---|---|---|
| Language and runtime | JavaScript (ES modules) on Node 22, in Electron's main process | The app's stack; the file is read where detection runs | Renderer-side read: the renderer is sandboxed and has no file access |
| Path safety | A fixed relative path plus `fs.lstat` on `.thadeus/` and the file (NFR3.1) | The path is a constant, so only symlinks need refusing, and the check must work before the file exists | `resolveInRoot` from `projectAccess.js`: it fails on a missing path and allows symlinks inside the root, which BR1.1 refuses |
| Read | `fs.lstat` plus `fs.readFile` and `JSON.parse`, with the 64 KiB cap | `readJsonSafe` returns null for every failure, but BR1.2 needs to tell missing from unreadable | `readJsonSafe` as is: it hides the reason |
| Write | `writeAtomic` from `fileWrite.js` | Already writes a temp file and renames it (NFR3.4, BR2.6) | A new temp-and-rename: duplicate code |
| Format | Plain JSON, two-space indent, trailing newline | Diffs cleanly in git, so a conflict between clones is readable | YAML: needs the parser only U7 uses |
| Messages | `t()` from `shared/i18n.js` | NFR1 | none |
| Tests | vitest `main` project, real temp folders (`fs.mkdtemp`) | Symlinks and renames need a real filesystem | Mocked `fs`: misses the symlink cases |

## Where it plugs in

- New module `src/main/projectFile.js` exporting `readProjectFile(root)` and `writeProjectFile(root, framework)`.
- `ipc.js` passes the read result into U1's detection on open and re-detect (W1). U4 and U8 call the write.
