# Tech Stack Decisions: u4-install

## Sources

- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md` (installed versions; no JSON-editing or diff library installed)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR8; FR4.3, FR4.7)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/functional-spec.md` (opencode path, apply sketch)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/rules.md` (BR7.3, BR7.4, BR7.10, BR7.13, BR7.16, BR7.17)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C6 `thadeus-dialog.js`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/tech-stack-decisions.md` (u1 D4 plugin in JavaScript; u1 NFR8.1–NFR8.4 quality gates)
- Existing code: `src/main/fileWrite.js` (`writeFileSafe`), `src/main/projectAccess.js` (`resolveInRoot`, `readJsonSafe`), `src/main/watcher.js` (`watchFiles`), `src/main/harness.js` (`detectHarnesses`)

## Summary

No new dependency. The installer reuses the app's own file helpers and watcher, plus Node built-ins.

| Part | Choice | Version | New? |
|---|---|---|---|
| HookInstaller (status, preview, apply) | JavaScript ES module in main, `node:fs`, `node:crypto` (sha256, `randomUUID`), `node:path` | Electron 45.3.1 / Node 22 | no |
| Root confinement | `resolveInRoot` from `projectAccess.js` | — | no |
| Atomic write | the temp-file-and-rename step of `writeFileSafe`, moved into a shared helper (D1) | — | no |
| Settings edit | a small span finder over the file text, with `JSON.parse` as the check (D3) | — | no |
| Preview diff | built from the splices themselves (D5) | — | no |
| Script and plugin bytes | bundled with Vite `?raw` imports (D2) | Vite 8.3.8 | no |
| Watching the three paths | `watchFiles` from `watcher.js` (`chokidar` 4.0.3) | — | no |
| UI (M7, M8, Project settings section) | React, i18next | 19.3.1, 27.1.1 | no |
| Tests | vitest `main` and `renderer` projects, Testing Library | 5.1.0, 16.3.3 | no |

## Decisions

### D1 One atomic-write helper for the editor and the installer

- **Context:** BR7.16 needs a temp file and a rename. `writeFileSafe` already does exactly that, but it refuses engine-owned paths (`.claude/`, `.opencode/`) and needs the file to exist. Both rules must stay for the editor (NFR3.30).
- **Decision:** move the temp-write, rename and cleanup lines of `writeFileSafe` into an exported `writeAtomic(absPath, bytes, { mode })` in `fileWrite.js`. `writeFileSafe` calls it unchanged. The installer calls it after its own path check (NFR3.24, NFR3.25). Its check covers paths that do not exist yet through their deepest existing folder, because `resolveInRoot` calls `fs.realpath`, which fails on a missing path.
- **Alternatives rejected:** a second copy of the temp-and-rename code (two copies of a safety step drift apart); calling `writeFileSafe` with an engine-owned bypass flag (widens the editor's write path, which NFR3.30 forbids).
- **Consequences:** the editor's tests cover the shared helper too; NFR5.25's failure tests run against one implementation.
- **Security:** the engine-owned rule stays in `writeFileSafe` only. The helper takes an already-checked absolute path and is not reachable from IPC.

### D2 The script and the plugin ship inside the main bundle

- **Context:** NFR3.29 and NFR4.10 need the installed bytes to equal the bytes u1–u3 tested. Reading the files from the packaged app at run time depends on asar paths.
- **Decision:** keep `dialog.sh` and `thadeus-dialog.js` as source files and import them in main with Vite `?raw`. The current CanonicalRelease's digests are computed with sha256 when the module loads. Earlier releases are a hand-kept list of `{ release, entries, scriptDigest, pluginDigest }`.
- **Alternatives rejected:** reading from `process.resourcesPath` (a packaging step and a path that differs between dev and the built app); a build-time digest file (an extra build step for a value computed in microseconds).
- **Consequences:** vitest imports the same `?raw` files, so the u1–u3 script and plugin tests and the u4 digest test see identical bytes. A release that changes either file must add the previous digests to the earlier-release list. A unit test fails when the current digest is missing from a release entry.
- **Security:** no file outside the bundle is read to build what is written.

### D3 Splice `.claude/settings.json` with a span finder, checked by `JSON.parse`

- **Context:** BR7.10 forbids parsing and re-serialising the whole file. Only three operations are needed: replace an inner hook object, remove an array element with its separator, and append an element or a key. No JSON-editing library is installed.
- **Decision:** a small scanner walks the file text, skipping string contents and escapes, and records the byte span of `hooks`, each event array, each group and each inner hook object. Splices are applied to the text. The result must `JSON.parse`, and every non-app value must deep-equal the old one, or the apply refuses with `unexpectedShape` (NFR3.28). The scanner never decides what is the app's: classification runs on the parsed value (BR7.1, NFR5.30) and is mapped to spans by position (`hookEvent`, `groupIndex`, `hookIndex`).
- **Alternatives rejected:** `JSON.parse` then `JSON.stringify` (reformats the whole file, breaks BR7.10); adding `jsonc-parser` (a correct tool for this, but a new runtime dependency for three operations whose output is fully checked anyway).
- **Consequences:** a scanner bug becomes a refusal, never a damaged file. `ponytail:` comment at the scanner: strict JSON only (Claude Code's settings file has no comments); switch to `jsonc-parser` if comments or trailing commas must be kept.
- **Security:** the post-check is the integrity guard for other people's entries.

### D4 The opencode plugin path is `.opencode/plugins/thadeus-dialog.js`

- **Context:** the u4 Functional Design fixed `.opencode/plugins/thadeus-dialog.ts`. u1 D4 chose JavaScript for the plugin and left the final path to u4; C6 names `thadeus-dialog.js`; u2 and u3 build against `thadeus-dialog.js`. opencode loads both extensions from the folder.
- **Decision:** the installed path is `.opencode/plugins/thadeus-dialog.js`. It supersedes the `.ts` name in this Unit's functional-spec.md, rules.md (BR7.3, BR7.13) and entities.md. NFR Design and Code Generation use `.js`.
- **Alternatives rejected:** `.ts` (the repository has no TypeScript, and u1 D4 already rejected it).
- **Consequences:** the folder `.opencode/plugins/` and the loading rule found by the u1 spike stay the same. The FD's three-path list reads with `.js`.
- **Security:** none.

### D5 The preview diff comes from the splices

- **Context:** BR7.7 needs a unified diff with signs. No diff library is installed, and the installer already knows every change it makes.
- **Decision:** each splice becomes one hunk. Its old lines carry `-`, its new lines carry `+`, and up to 3 lines of context sit on each side (NFR5.36). A whole-file create is all `+`, a delete is all `-`, and a whole-file replace is all `-` then all `+`.
- **Alternatives rejected:** a general line-diff algorithm (code for a problem the installer does not have); showing it in Monaco's diff editor (needs `nextContent` in the renderer, which NFR3.27 forbids).
- **Consequences:** the diff is exact by construction and stays small.
- **Security:** the renderer receives only diff text, never `nextContent`.

### D6 Status recomputation reuses `watchFiles`

- **Context:** BR7.17 recomputes status when a file changes, including when its folder does not exist yet.
- **Decision:** one `watchFiles({ root, paths: [the three paths] })` per open project, with its 300 ms debounce and 800 ms max wait (NFR1.16, NFR5.37).
- **Alternatives rejected:** a second `chokidar` watcher with its own options (the existing helper already handles missing folders, F-01).
- **Consequences:** none beyond the watcher's existing behaviour.
- **Security:** none; the watcher only triggers a read.

### D7 Quality gates (NFR8)

u1 NFR8.1 (test first), u1 NFR8.2 (≥ 80% line coverage of new and changed files), u1 NFR8.3 (ESLint and Prettier, 0 errors) apply to this Unit's files unchanged. This Unit adds:

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR8.8 | The installer is tested on real temporary project folders against a fixed set of settings fixtures. | the fixtures are: no file; `{}`; no `hooks` key; `"hooks": {}`; this repository's `.claude/settings.json` with AI-DLC's hooks; a non-app `PreToolUse` group; 4-space indentation; tab indentation; CRLF line ends; a byte order mark; no final newline; unknown top-level keys; current app entries; earlier-release entries; a hand-edited entry; a duplicate app entry; invalid JSON; `hooks` as an array. Each runs through status, Install, Install again, Update and Remove where they apply, and Install then Remove | The suite in CI; the full `npx vitest run tests/` green before merge |
| NFR8.9 | The install works against the real harnesses before the release pull request. | on the release Mac: Install for Claude Code and opencode in a project with AI-DLC installed; a new agent tab of each gets its next question through the hook (u1 W1); a plain `claude` in a terminal outside the app is unaffected (NFR4.11); after Remove both are back on the fallback; `git diff` after Install shows only the app's lines | Manual run, recorded in the pull request |
