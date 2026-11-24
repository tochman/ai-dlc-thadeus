# Security Design: U8 u8-framework-switch

Sources: `security-requirements.md` (NFR3.4–NFR3.7, NFR4.5), `tech-stack-decisions.md` (NFR4.6, NFR8.3), the U8 `functional-spec.md` and `rules.md`, and contracts C2, C3 and C10 in `contract-summary.md`. The design reuses `detectProject`, `writeProjectFile` (`projectFile.js`, U2) and the open-project record in `ipc.js`.

## Input check, before any file access (NFR3.5, NFR3.6)

Both handlers start with one shared check, `switchTarget(projectId, to)`:

1. `project(projectId)` from the main process's open-project record; unknown id throws `t('errors.unknownProject')`. The root comes from that record; the renderer sends no path and extra arguments are ignored.
2. `to` must be in `FRAMEWORKS` and differ from `p.framework`; otherwise it throws `t('framework.switchInvalid', { to })`.

A throw rejects the IPC call, so the renderer gets the translated message as the error of its `invoke`; `FrameworkSection` shows it as `framework-switch-error` and stays `idle`. This is how a bad id or `to` reaches the renderer for `switchPreview`, which has no error shape in C10. `switch` uses the same throws for bad input and keeps C10's `{ ok: false, error }` for `setupNeeded` and `writeFailed`.

## Preview reads only (NFR3.4, NFR3.6)

`switchPreview` calls `detectProject`, `listSpaces`, `loadIntentList` and `loadSpeckitFeatures`, all read-only. `keeps` is built from the fixed names (`aidlc/` when `found.aidlc`, `.specify/` and `specs/` when `found.speckit`), never from a path read from disk. The write-spy test covers the preview with intents and features present.

## The one write (NFR3.4, NFR3.7)

`switch(projectId, to)` in this order:

1. `switchTarget` as above.
2. `detectProject(root).found[to]`; false returns `{ ok: false, error: { code: 'setupNeeded', message } }` and writes nothing, whatever the renderer believes, so a failed or cancelled setup can never be followed by a write (BR8.4).
3. `writeProjectFile(root, to)`; its `{ ok: false }` becomes `writeFailed` with its translated message, file unchanged.
4. `applyDetection` (see `performance-design.md`). If the second `detectProject` throws, the file is still written: the error is logged and the reply is `{ ok: true, detection: null }`; the section then says the switch is saved and the views follow when the project is opened again (`t('framework.switchedReopen')`).

Nothing is renamed or deleted; `.specify/`, `specs/` and `aidlc/` are never written.

## No program of its own (NFR4.5)

The setup step is started by the renderer through the existing `setup:run` and `speckit:setup` handlers, with their own preview, fixed arguments, no shell and timeout (C7). `switchPreview` and `switch` import no runner; a test with an injected runner asserts neither calls it.
