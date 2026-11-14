# Security Requirements: u4-install

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR3, NFR4; FR4.1–FR4.4, FR4.6, FR4.7; Constraints on `isEngineOwned` and the renderer never writing a settings file)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/functional-spec.md` (entry set, W2, W5, W7, apply sketch, Known limits)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/rules.md` (BR7.1, BR7.2, BR7.9, BR7.10, BR7.13, BR7.19)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/entities.md` (InstallPreview `previewId`, PreviewFile `nextContent` kept in main, CanonicalRelease)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/reviews/review-01.md` (R-04 duplicate hooks)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C4 `agentHooks.*`, C6 entries)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md` (sandboxed preload, no network use in main beyond `gh`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/security-requirements.md` (the shared base: u1 NFR3.1–NFR3.10, threat model, accepted risk)
- Existing code: `src/main/projectAccess.js` (`resolveInRoot` uses `fs.realpath`, so it needs an existing path), `src/main/fileWrite.js` (`isEngineOwned`, temp file and rename)

## What this Unit adds to the threat model

u1's threat model, accepted risk and out-of-scope list apply unchanged (u1 security file). This Unit is the one place the app writes into the project's committed files, so the asset is the project itself and every teammate who pulls it.

| Asset | Threat | Where it is stopped |
|---|---|---|
| Files outside the app's three paths | the installer writes or deletes elsewhere: a path from the renderer, `..`, a symlinked folder pointing out of the root | NFR3.24, NFR3.25, NFR3.27 |
| Teammates' and AI-DLC's settings | the installer changes, reorders or reformats entries that are not the app's | NFR3.28 |
| The person's consent | a write without the person's yes: at app start, project open, status, a stale or replayed preview | NFR3.26 |
| What the person approved | the bytes written differ from the diff the person saw | NFR3.27 |
| Every teammate's agent | the committed command or script carries something other than the release's fixed text | NFR3.29 |
| The editor's protection of harness folders | the installer's exception widens the editor's write rights | NFR3.30 |

Accepted risk (R-04 of the Functional Design review): Claude Code merges hooks from `.claude/settings.json`, `.claude/settings.local.json` and the user's own settings. The app reads and writes only `.claude/settings.json` (BR7.13). It never reads the user's settings, which lie outside the project root. A copy of an app entry in another settings file therefore goes unseen. Claude Code documents that identical hook commands are run once. An exact copy then fires once; an edited copy fires a second hook for the same event. The second hook is a session the app started, so it stays inside the person's own dialog and needs the person's click like any other (u1 NFR3.7). No control is added. NFR Design confirms the deduplication against Claude Code 2.1.325 and writes the result into the Known limits.

Out of scope: signing the committed script or plugin (the project's git history and the pull request review are the control, as in u1), and other OS users (the files carry the project's normal modes, NFR5.34).

## Requirements (NFR3)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR3.24 | The installer writes, creates or deletes only `.claude/settings.json`, `.thadeus/hooks/dialog.sh`, `.opencode/plugins/thadeus-dialog.js` and their own folders, all inside the project root (BR7.13). A path that does not exist yet is checked through its deepest existing folder: that folder goes through `resolveInRoot`, and the rest of the path must be plain names (no `..`, no separators beyond the fixed path). | 0 writes outside the three paths and their folders; a folder or file that is a symlink resolving outside the root refuses with `outsideRoot` and writes nothing | Unit tests on a temporary project: `.claude` as a symlink to a folder outside the root, `.thadeus` as such a symlink, `.claude/settings.json` as a symlink to a file outside the root; in each, apply refuses and the outside target's bytes and mtime are unchanged |
| NFR3.25 | Writes go to the real path, and the files the app owns whole are regular files. A `.claude/settings.json` that is a symlink to a file inside the root is written through: the temp file goes next to the real target, and the link stays a link. `dialog.sh` and the plugin must be regular files; a symlink there refuses with `cannotWrite` ("is a link"). Folders are removed only with a non-recursive `rmdir` when empty. | after Install over a symlinked settings file, `lstat` still shows a link and the target holds the new bytes; Remove with a symlinked script deletes nothing; a non-empty `.thadeus/` survives Remove with its other files intact | Unit tests for each case on a temporary project |
| NFR3.26 | Nothing is written without the person's yes, and a preview applies at most once (BR7.9). `previewId` comes from `crypto.randomUUID()`. It is accepted only while it is `open`, for the project it was built for. | status, preview, project open and app start make 0 writes; `apply` with an unknown, applied, refused or superseded id, or with another project's id, writes 0 bytes and refuses with `previewUnknown`; two `apply` calls started together for one preview write once | Unit tests with `fs` write spies across status, preview and start; one test per refused id case; a test that fires two `apply` calls without awaiting the first |
| NFR3.27 | What the person saw is what is written (BR7.7, BR7.13). The bytes written for each file equal that PreviewFile's `nextContent`, which never leaves main. The renderer sends only `projectId`, `harness` (`claude` or `opencode`), `action` (`install`, `update` or `remove`) and `previewId`; it never sends a path or content. | written file's sha256 equals the preview's `nextContent` sha256; the serialised `agentHooks.preview` result holds no `nextContent`; an IPC call with an extra field, an unknown harness or action, or a non-string id is refused before any read | Unit tests: digest compare after apply; payload inspection; IPC handler tests with crafted arguments, each refused with 0 file reads |
| NFR3.28 | Other entries and settings stay as they were (BR7.10, FR4.3). Only the app's spans of `.claude/settings.json` change. Key order, indentation, line ends, a byte order mark, a missing or present final newline and every non-app value stay as found. Outside the app's spans, the only byte change allowed is one `,` added or removed next to an appended or removed app span. | for every fixture in NFR8.8, every non-app value deep-equals the old one after Install, Update and Remove; the line diff outside app spans is empty except that one separator; a result that breaks either refuses with `unexpectedShape` and writes nothing | Fixture tests comparing parsed values and a line diff; a test with a deliberately broken splice confirms the refusal |
| NFR3.29 | The content written is fixed in the app release and never built from project data. The four command strings are the C6 constants. The project path is reached through `$CLAUDE_PROJECT_DIR` at run time and is never interpolated into the file. The script and plugin bytes come from the app bundle (tech-stack D2). The installer opens no network connection. | the commands in the written file equal the CanonicalRelease strings byte for byte, for a project root holding spaces, quotes and `$` in its path; script and plugin sha256 equal the bundled files; the installer module imports none of `net`, `http`, `https`, `electron`'s `net` and calls no `fetch` | Unit test with a root named `a b "c" $d`; digest tests; a source test over the installer module for network imports and `fetch` |
| NFR3.30 | The editor's engine-owned rule is unchanged (requirements, Constraints). The installer has its own write path. `isEngineOwned` and `writeFileSafe` are not loosened for `.claude/` or `.opencode/`. `.thadeus/` stays editable in the editor like any project folder. | `isEngineOwned('.claude/settings.json')` and `isEngineOwned('.opencode/plugins/thadeus-dialog.js')` stay true; `writeFileSafe` on either still throws `engineOwned` | Existing `fileWrite` tests, plus these two cases |

u1 NFR3.8 (the script never interprets the payload) holds for the installed script because NFR3.29 installs the bytes u1–u3 tested. The refusal and apply log lines are NFR3.31 and NFR3.32 in `observability-requirements.md`.

## Compliance

Nothing leaves the machine and no personal data is written: the files hold fixed commands and the release's script and plugin. Committing them is the person's choice, made in the preview, which says that they are shared with the team (BR7.7). No compliance regime applies.
