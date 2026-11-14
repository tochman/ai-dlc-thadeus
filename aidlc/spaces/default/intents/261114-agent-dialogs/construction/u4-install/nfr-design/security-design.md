# Security Design: u4-install

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-design/nfr-design-questions.md` (no questions; the ownership rule and the refuse-on-doubt rule)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-requirements/security-requirements.md` (threat table, accepted risk, NFR3.24–NFR3.30)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-requirements/reliability-requirements.md` (NFR5.29, NFR5.30)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-requirements/tech-stack-decisions.md` (D1, D2, D3)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-requirements/reviews/review-01.md` (R-01, R-02, R-04, R-05, R-06)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/functional-spec.md` (entry set, W2, W5, W7, apply sketch, Known limits)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C4 `agentHooks.*`, C6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/logical-components.md` (LC6 IpcRouter, LC8 `dialog.sh`, isolation strategy)
- Existing code: `src/main/projectAccess.js` (`openRoot`, `resolveInRoot`), `src/main/fileWrite.js` (`isEngineOwned`, `writeFileSafe`), `src/main/ipc.js` (handler table, `project()`, `plans:previewEdit` pattern)

## Approach

u1-questions' threat model and accepted risk stand. This Unit is the only place the app writes into committed project files, so the design is built on three rules:

1. **Fixed paths, no links.** The three paths are constants. No path, name or content crosses IPC. Every existing part of each path is checked with `lstat`, and a link anywhere refuses.
2. **The person's yes, once.** A preview is applied at most once, by its id, while it is open, and only with the bytes it showed.
3. **Refuse on doubt.** The settings edit is checked after splicing. If the check cannot prove that only the app's entries changed and that they came out canonical, nothing is written.

## Design elements

### SD30 Path check: fixed table, `lstat` on every part, links refused

- **Satisfies:** NFR3.24, NFR3.25; resolves review R-04.
- **Design:** `FILES = { settings: '.claude/settings.json', script: '.thadeus/hooks/dialog.sh', plugin: '.opencode/plugins/thadeus-dialog.js' }`. `checkPath(root, rel)` walks the prefixes of `rel` (`.thadeus`, `.thadeus/hooks`, `.thadeus/hooks/dialog.sh`) with `fs.lstat`:
  - `ENOENT`: this part and everything after it are absent. The walk stops; the file is "absent", and the missing folders are known by name.
  - a symbolic link (folder or file, dangling or not): `fs.realpath` it. Outside the root, or dangling: `outsideRoot` for outside, `cannotWrite` with cause `link` for dangling. Inside the root: `cannotWrite` with cause `link` too. A link is never treated as absent and never written through.
  - a folder part that is not a directory, or a final part that is not a regular file: `cannotWrite` (`ENOTDIR` or `notAFile`).
  - Then the deepest existing part goes through `resolveInRoot`, and its result must equal `path.join(root, prefix)`. This proves that no part, the root's own parents included, is a link.
- **Decision (R-04, "written through or not"):** a symlinked `.claude/settings.json` is refused, not written through. This narrows NFR3.25's first clause. Writing through would need its own rules for the target (not engine-owned, not under `.git`, not another committed file), and a project-level settings file kept as a link is not a case anyone has asked for. The status shows the reason, and no action is offered (RD39). Code Generation updates NFR3.25's wording and test in the same step.
- **Accepted limit:** a process running as the same OS user can swap a checked folder for a link between the check and the rename. That user can already write the project directly, which u1-questions' threat model accepts. Nothing more is built.
- **Test:** unit tests on a temporary project for each case: `.claude` linked outside the root, `.thadeus` linked outside, `.claude/settings.json` linked to a file outside, `.claude` linked to `docs/` inside the root, `.thadeus` linked to `.git/`, a dangling `.claude/settings.json` link, `.thadeus/hooks/dialog.sh` linked to a file inside the root. In each, status carries the reason, preview offers no apply, and the bytes and mtime of the link's target are unchanged.

### SD31 Previews: one open per harness, `applying` set before the first `await`

- **Satisfies:** NFR3.26; resolves review R-05.
- **Design:** previews live on the project entry, `p.hookPreviews: Map<previewId, Preview>`, with `previewId = crypto.randomUUID()`. A Preview is `{ harness, action, files, state }`, where `state` is `open` or `applying`. Final states are not kept: a preview that is applied, refused or superseded is deleted from the map, so "not in the map" is the only final state and can never be applied.
  - `preview(p, harness, action)`: deletes any preview of the same harness (superseded), then adds the new one as `open`.
  - `apply(p, previewId)`: synchronously, before any `await`: `pv = p.hookPreviews.get(previewId)`; when `pv` is missing or `pv.state !== 'open'`, return `refused: previewUnknown`. Otherwise set `pv.state = 'applying'`, then queue the work on the project's apply chain (RD40). A second `apply` with the same id, started before the first finished, therefore finds `applying` and refuses.
  - `cancel(p, previewId)`: deletes the preview when it is `open`. This is a new C4 member, `agentHooks.cancel(projectId, previewId)`, added because the spec's Cancel (W2 step 4) must end the preview in main, not only in the renderer.
  - Project close drops `p` and all its previews.
- **Lifetime bound:** at most one preview per harness, so at most 2 per project. Each holds the old and next bytes of at most two files. No age limit is needed on top of that count.
- **Another project's id:** previews are per project, so an id from project A sent with project B's id is not found and refuses with `previewUnknown`.
- **Test:** `fs` write spies across status, preview, project open and app start: 0 writes. One test per refused id: unknown, already applied, refused, superseded by a newer preview, cancelled, another project's. A test that calls `apply` twice without awaiting the first: one write per file, the second result is `previewUnknown`.

### SD32 IPC: an exact argument list per handler

- **Satisfies:** NFR3.27; resolves review R-06.
- **Design:** the handlers take positional arguments, as every handler in `ipc.js` does, and check the count with a rest parameter before anything else:

| Channel | Arguments, exactly | Checks, all before any file read |
|---|---|---|
| `agentHooks:status` | `projectId` | 1 argument; `project(projectId)` |
| `agentHooks:preview` | `projectId`, `harness`, `action` | 3 arguments; `harness` is `'claude'` or `'opencode'`; `action` is `'install'`, `'update'` or `'remove'` |
| `agentHooks:apply` | `projectId`, `previewId` | 2 arguments; `previewId` is a string matching the `randomUUID` shape |
| `agentHooks:cancel` | `projectId`, `previewId` | as `apply` |

  `apply` and `cancel` never take a harness or an action: they use the preview's own. A failed check throws `Error(t('errors.invalidValue', …))`, the existing pattern, so the renderer gets a rejected promise. The preload bridge passes exactly these arguments.
- **Test:** IPC handler tests that call each handler with one argument too many, one too few, an unknown harness, an unknown action, a number as `previewId` and an object as `previewId`. Each throws, and an `fs` spy records 0 reads.

### SD33 The bytes written are the bytes shown

- **Satisfies:** NFR3.27.
- **Design:** a PreviewFile in main is `{ rel, change, baseDigest, nextBytes, summary, diff, replacesHandEdit }`. The IPC result is built by an explicit pick of `previewId` and `{ path: rel, change, summary, diff, replacesHandEdit }` for each file, so `nextBytes` and `baseDigest` never leave main. Apply writes `nextBytes` as it is (RD33).
- **Test:** after apply, the sha256 of each written file equals the sha256 of its preview's `nextBytes`. `JSON.stringify` of the `preview` result contains neither key nor any line of a fixture that the diff does not show.

### SD34 Whose entries, and the post-check of the settings splice

- **Satisfies:** NFR3.28, with NFR5.29 and NFR5.30; resolves review R-01 and R-02 (a)–(d).
- **Ownership rule (R-01).** An entry is the app's only when its command runs exactly `.thadeus/hooks/dialog.sh` with one of the four kinds. Any other command, including another script in `.thadeus/hooks/` and `dialog.sh` with an unknown or missing kind, is someone else's: status ignores it, and Update and Remove never touch it.

```js
// US-0506 BR7.1 (as amended): the app's entries, and only those
const KINDS = new Set(['question', 'answered', 'permission', 'reply']);
const RUN = /\.thadeus\/hooks\/dialog\.sh"? +([a-z]+)(?=$|[\s;"'])/;
export function appKind(command) {
  const m = typeof command === 'string' ? RUN.exec(command) : null;
  return m && KINDS.has(m[1]) ? m[1] : null; // null: not the app's
}
```

  This replaces "a script in `.thadeus/hooks/`" in BR7.1 and in C6 `recognised_as_the_apps`, and the `unknown` results of NFR5.30 now read "not the app's". The Remove post-condition (NFR5.29) becomes "no command in `.claude/settings.json` is the app's by `appKind`". The amendment text is in `logical-components.md`.
- **Reading the file (R-02 (b), (d)).**
  1. The bytes must survive UTF-8 decoding unchanged (`Buffer.from(text, 'utf8').equals(bytes)`); otherwise `invalidJson`. Without this, invalid UTF-8 outside the app's spans would be rewritten as U+FFFD.
  2. A leading U+FEFF is taken off before scanning and parsing and put back on the result. A BOM anywhere else fails the parse.
  3. `JSON.parse` on the rest. A failure is `invalidJson`, and its sentence says the file "is not plain JSON, so the app does not change it" (PD36). The design does not claim that Claude Code rejects comments. The `ponytail:` comment at the scanner reads: "strict JSON only; a file with comments or trailing commas is refused as `invalidJson`; switch to `jsonc-parser` if such files turn up".
- **Scanner refusals (R-02 (a)).** The span finder (D3) refuses with `unexpectedShape` when, in any object it walks (the top level, `hooks`, each group, each inner hook), a key appears twice or a key's raw text holds a `\`. Keys are then compared as raw text, which equals the parsed key. `hooks` not an object, an event value not an array, a group without a `hooks` array: `unexpectedShape` (BR7.12).
- **Splicing.** Inserted text uses the file's own line end (`\r\n` when the first line end is CRLF) and indent unit (the leading whitespace of the first indented line; two spaces when there is none). A final newline is kept as found, or written when the app creates the file.
- **Post-check before any write (R-02 (c)).** The spliced text goes through steps 1–3 and the scanner again, then must pass all of these:
  - it starts with U+FEFF exactly when the old file did;
  - `isDeepStrictEqual(prune(stripApp(next)), prune(stripApp(old)))`, where `stripApp` removes every hook `appKind` claims and `prune` removes, inside `hooks` only, groups with an empty `hooks` array, empty event arrays and an empty `hooks` object;
  - the classifier (BR7.4) on the parsed result finds, for `install` and `update`, exactly one app entry per kind for this harness's events, each `current`; for `remove`, none.
  
  Any miss refuses with `unexpectedShape`. The check runs when the preview is built: a preview that fails it offers no apply, and the sentence is shown. Apply writes only the checked bytes, guarded by the digest (RD35), so the check does not need to run again.
- **Test:** fixtures (RD43) for: a teammate hook `sh .thadeus/hooks/other.sh question` under `PreToolUse` and a `dialog.sh questionx` entry, both byte-identical after Install, Update and Remove; two top-level `hooks` keys; `"hooks"` as a key; a BOM file whose bytes after Install start with `EF BB BF` and parse after the BOM is taken off; a file with an invalid UTF-8 byte in a non-app string (`invalidJson`); a JSONC file with a comment (`invalidJson` and the plain-JSON sentence); a test that patches the splicer to drop a non-app key and to write the `answered` entry with a wrong timeout, each refused with `unexpectedShape` and 0 writes.

### SD35 Content fixed in the release

- **Satisfies:** NFR3.29.
- **Design:** the four commands are built from the kind only, as the C6 string with `<kind>` filled from `KINDS`. No project data enters them: the project is reached through `$CLAUDE_PROJECT_DIR` when the hook runs. `dialog.sh` and `thadeus-dialog.js` are `?raw` imports (D2). The installer module imports only `node:fs`, `node:path`, `node:crypto`, `node:util`, `./fileWrite.js`, `./projectAccess.js`, `./watcher.js` and the shared i18n.
- **Test:** an Install into a temporary root named `a b "c" $d` writes commands equal byte for byte to the CanonicalRelease strings; the script's and plugin's sha256 equal the bundled files'; a source test reads `src/main/agentHooks.js` and finds no import of `net`, `http`, `https`, `node:net`, `node:http`, `node:https`, no `electron` import of `net`, and no `fetch(`.

### SD36 The editor's rule is not loosened

- **Satisfies:** NFR3.30.
- **Design:** D1 moves only the temp-write, `chmod`, rename and cleanup into `writeAtomic(abs, bytes, { mode })` in `fileWrite.js`. `writeFileSafe` keeps its `resolveEditable` check and calls the helper after it. `writeAtomic` takes an absolute path that the caller has already checked. It is imported only by `agentHooks.js` and `fileWrite.js`, and no IPC handler calls it.
- **Test:** existing `fileWrite` tests stay green; `isEngineOwned('.claude/settings.json')` and `isEngineOwned('.opencode/plugins/thadeus-dialog.js')` are true; `writeFileSafe` on each throws `engineOwned`; `.thadeus/hooks/dialog.sh` stays editable (`isEngineOwned` false); a source test finds `writeAtomic` imported nowhere but those two modules.

## Accepted risk: duplicate hooks from other settings files

The risk from the NFR Requirements (FD review R-04) stands. The app reads and writes only `.claude/settings.json`.

**Deduplication check.** Claude Code's hooks reference says that identical hook commands are deduplicated and run once. That covers an exact copy of an app entry in `.claude/settings.local.json` or the user's settings. This design could not run Claude Code 2.1.325 here, so the check against that release is one step of the NFR8.9 manual run (RD44): an exact copy of the `question` entry in `.claude/settings.local.json` must give one event file per question. The result goes into the functional spec's Known limits in Code Generation. If the copy fires twice, the second hook is still a session the app started. It waits in the person's own dialog like any other event (u1 NFR3.7), so the risk is accepted as stated, and no control is added.

## u1 rows this Unit cites

| u1 row | How u4 keeps it |
|---|---|
| NFR3.1–NFR3.10 (channel, secret, intake, answers, dialog) | unchanged; the installer touches none of u1-questions LC1–LC10's checks |
| NFR3.7 (nothing sent without the person's click) | holds for any duplicate hook (accepted risk above) |
| NFR3.8 (the script never interprets the payload) | holds because SD35 installs the same bytes u1–u3 tested |
