# EPIC-10: Editing — change files in the console

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Today the console shows a project's files read-only (the artifact reader, the docs dialog, the Features view), and "Öppna i editor" hands a file to the OS's default editor, often VS Code. This epic lets the person edit files in the app itself with the Monaco editor (the one VS Code is built on) through [`@monaco-editor/react`](https://github.com/suren-atoyan/monaco-react): AI-DLC's Markdown documents, the feature docs, and the project's code.
>
> **This changes the app's "read-only towards the project" rule** (EPIC-01; codekb `architecture.md`, Key Design Decisions). The app may now write files in an opened project, but only a file the person opened and saved themselves, inside the project root, through main. AI-DLC's engine-owned files stay off limits, as EPIC-09 decided:
> - workflow state (`aidlc-state.md`);
> - the audit shards and `intents.json`;
> - the engine folders (`.claude/`, `.aidlc/`, `.opencode/` …).
>
> Those open read-only in the editor.

**Stories:** US-1001

**Status (2026-11-14):** 📋 Planned. Added at the person's request.

---

## User Stories

**US-1001: Edit files in the app with Monaco** 📋 Planned
- As a **developer working on a project in the console**, in order to **make a quick change without switching to VS Code**, I would like to **open any file of the project in a Monaco editor inside the app, edit it with syntax highlighting, and save it**.
- **Epic:** EPIC-10
- **Priority:** Medium
- **Complexity:** High
- **Background:** Monaco is a large dependency (a few MB), so it is loaded lazily the first time an editor opens, not at app start.
- **Monaco in Electron (special notes, from the [monaco-react README](https://github.com/suren-atoyan/monaco-react)):**
  - **The CDN default fails in Electron.** `@monaco-editor/react` downloads Monaco from a CDN (jsdelivr) unless told otherwise. In Electron that usually shows as an editor stuck on "Loading…", because the app may not load external sources. THADEUS blocks them twice over: its CSP in `src/renderer/index.html` and the navigation and window-open handlers in main. So the loader must never fall back to the CDN.
  - **Use the npm package, not a path.** The README describes two Electron fixes:
    - `loader.config({ paths: { vs: … } })` with a `file://` path to `node_modules/monaco-editor/min/vs`, built with `__dirname` and a `uriFromPath` helper from Microsoft's Electron sample. It doesn't fit here: the renderer is sandboxed (`contextIsolation`, no `nodeIntegration`, `sandbox`), so `__dirname` and `path` aren't available, and `node_modules` isn't shipped in the packaged app.
    - Since v4.4.0, `import * as monaco from 'monaco-editor'` with `loader.config({ monaco })`. Use this one: electron-vite bundles Monaco into the renderer.
  - **Web workers through Vite.** With the npm package under Vite, each language worker is imported with `?worker` (`editor.worker`, `json.worker`, `css.worker`, `html.worker`, `ts.worker`). `self.MonacoEnvironment = { getWorker(_, label) { … } }` returns the right worker per label (`json`; `css`/`scss`/`less`; `html`/`handlebars`/`razor`; `typescript`/`javascript`; and the editor worker for everything else). This must run before `loader.init()`.
  - **CSP:**
    - Vite emits the workers as same-origin files or `blob:` URLs, so the CSP needs `worker-src 'self' blob:`.
    - Monaco injects styles at runtime, which `style-src 'self' 'unsafe-inline'` already allows.
    - Keep `script-src` without `'unsafe-eval'`. Check that the build doesn't need it, and record the finding.
  - **Packaging:**
    - Check that `electron-builder` ships the worker chunks in `out/renderer/assets/` and that they load under the packaged app's `file://` origin.
    - Check the asar setting: workers read from inside `app.asar` must work, otherwise unpack them.
    - Test this in the built `.dmg`/`.deb`, not only `npm run dev`.
  - **Bundle size:** keep only the languages and features needed, through `monaco-editor/esm/vs/editor/editor.api` plus explicit language contributions or `vite-plugin-monaco-editor`'s language list. Measure the renderer bundle before and after.
- **Acceptance Criteria:**
  - [ ] **Open:** an "Edit" action opens the file in an editor tab or panel inside the project view. It is offered:
    - in the artifact reader and the docs dialog;
    - on a story or epic in the Features view (opens the epic file);
    - from a simple project file browser (a tree of the project root, `.gitignore`d folders such as `node_modules/` and `out/` hidden).
    It replaces "Öppna i editor" as the default; the OS editor stays as a secondary action.
  - [ ] **Editor:**
    - Monaco with the language picked from the file extension: Markdown, JS/JSX, TS, JSON, YAML, CSS, HTML, shell and others Monaco ships with.
    - The app's LCARS dark theme as a Monaco theme.
    - Find and replace, multiple cursors, and the usual shortcuts (Cmd/Ctrl+S saves, Cmd/Ctrl+F finds).
    - For Markdown, a side-by-side preview through the app's existing Markdown renderer.
  - [ ] **Save safely:**
    - Writes go through a new narrow IPC (`file:write`, with `projectId`, a relative path and content) that uses `resolveInRoot`. Absolute paths, `..`, symlinks out of the root and engine-owned files are refused.
    - The file is written atomically (temp file plus rename).
    - Before saving, main checks that the file on disk hasn't changed since it was opened (mtime and hash). If it has, for example because an agent wrote it, the person is shown both versions and chooses to keep theirs, take the disk version, or compare them in Monaco's diff editor.
  - [ ] **Unsaved changes:**
    - A dot on the tab marks unsaved changes.
    - Closing the editor, switching project or quitting the app asks first.
    - When the file changes on disk and there are no unsaved changes, the editor reloads it quietly. When there are unsaved changes, it shows a one-line notice.
  - [ ] **Read-only where it must be:** engine-owned AI-DLC files (above) and binary files open read-only, with a one-line reason. Files over a size limit (for example 2 MB) open read-only.
  - [ ] **While the agent works:** if the project's agent tab is "Arbetar" and the file is inside the active intent's record, a calm notice says the agent may also be changing it. Saving is still allowed, with the conflict check above.
  - [ ] **Performance:** Monaco and its workers load only when an editor first opens. Opening a 1 MB file takes under 1 s on the reference machine. App start time is unchanged.
  - [ ] **Strings and tests:** every new label in sv and en. Tests cover:
    - the write IPC refusing out-of-root, `..`, symlink and engine-owned paths;
    - the atomic write;
    - the conflict check;
    - the unsaved-changes prompt;
    - language selection from the extension.
    Monaco itself is mocked in jsdom.
- **Notes:** Added 2026-11-14 at the person's request ("rather than opening VS Code, I would like to use monaco-react to edit files. Even code."). It overturns the read-only rule for files the person edits themselves. Engine-owned AI-DLC files stay protected.
- **Dependencies:** US-0101 (watcher), the artifact reader, EPIC-06 (Features view)
