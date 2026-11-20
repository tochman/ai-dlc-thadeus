# Security Design: U6 u6-speckit-features

Sources: `security-requirements.md` (NFR3.1–NFR3.4, NFR5.1–NFR5.3), `functional-spec.md`, contract C5 in `contract-summary.md`, and the answer to Q1 in `nfr-design-questions.md` (C: in the app, only `.specify/memory/constitution.md` can be edited).

## 1. Read-only Spec Kit files (NFR3.1, NFR3.2)

- **U6's own code** uses only `fs.readFile`, `fs.readdir`, `fs.lstat`, `fs.stat` and `fs.realpath`. A test runs `loadSpeckitFeatures` and the watcher on a fixture with spies on every fs write call, and expects no call (NFR3.1).
- **The app's editor (Q1 = C).** `fileWrite.js` already makes engine-owned files read-only: `resolveEditable` returns `engine`, `readForEdit` returns `readOnly: 'engine'`, and `writeFileSafe` throws. This gets one more case:
  - `resolveEditable(root, rel, { framework })` also returns `speckit: true` when `framework === 'speckit'` and the real path is under `specs/` or `.specify/`, except `.specify/memory/constitution.md`.
  - `readForEdit` returns `readOnly: 'speckit'`, so the editor opens the file read-only, the way it does for engine-owned files.
  - `writeFileSafe` throws `errors.speckitReadOnly` for it. This also covers the file tree and every other caller, because they all save through `writeFileSafe`.
  - `ipc.js` passes the project's `framework` from U1's detection to `file:read` and `file:write`.
- **Artifact reader.** The reader hides `artifact-reader-edit` when the file's `readOnly` is `'speckit'`. "Open in external editor" stays, since then the app does not write.
- In an AI-DLC project, or with no framework, nothing changes: a `specs/` folder there is an ordinary folder.

## 2. Paths stay in the project (NFR3.3, NFR3.4)

- `realRoot = realpath(root)`. `specs/` must have a real path that is `realRoot/specs`. A linked `specs/` folder is named in `errors`, and no features are read.
- A feature folder is a direct child entry of `specs/` that `lstat` says is a directory. Linked entries are skipped and named in `errors`. Linked files are left out of the file list.
- `feature_directory` is resolved against the root, then real-pathed. It is active only when it equals the real path of a listed feature folder. Anything else (outside the root, `..`, a link, a missing folder) gives `active: null` plus an `errors` entry.
- **Opening a file.** The features view opens a file through the existing `file:read`, which already resolves inside the root through `resolveInRoot` and throws for a path outside it. There is no separate list check, so a click right after a `speckit:changed` push is never refused because the list was stale. A file that has gone meanwhile gives the reader's normal "not found" message.

## 3. Untrusted file content (NFR5.1, NFR5.2, NFR5.3)

- Markdown is shown through the existing reader (react-markdown without raw HTML), so a `<script>` line shows as text. A renderer test pins this.
- Before reading, `stat` checks the size. A file over 1 MB, or one that is not valid UTF-8, goes in `errors` with the reason, and its feature still shows with the steps that file decides marked not done.
- The version check is the one in BR6.9: a version other than 1.4.x gives the warning, and reading goes on.

## Threats considered

| Threat | Handling |
|---|---|
| A path in `feature.json` points outside the project | Real-path check; `active: null`; named in errors |
| A link inside `specs/` points to a secret file | Linked entries are skipped |
| The app writes over what the agent is writing | Spec Kit files are read-only in the app, except the constitution |
| A huge or binary file stalls the main process | Size check before reading; 1 MB limit |
| A Markdown file runs a script in the renderer | No raw HTML in the reader |
