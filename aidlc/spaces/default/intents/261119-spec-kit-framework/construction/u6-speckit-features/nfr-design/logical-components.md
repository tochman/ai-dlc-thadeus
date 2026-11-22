# Logical Components: U6 u6-speckit-features

Sources: `security-design.md`, `performance-design.md`, `functional-spec.md`, and contract C5 in `contract-summary.md`. Everything runs inside the one desktop app. The failure domain is "this view for this project".

| Component | Process | Role | When it fails |
|---|---|---|---|
| `parsers/speckitTasks.js` (new) | main | `parseTasks(text)`, a pure function | Never throws; bad lines are counted as skipped |
| `speckitFeatures.js` (new) | main | `loadSpeckitFeatures(root)` gives the C5 result | Each failed read goes in `errors`; the call itself only throws for a missing project |
| `watcher.js` (changed) | main | New `/**` target form | The error is logged; the view keeps its last result |
| `fileWrite.js` (changed) | main | `speckit` read-only case in `resolveEditable`, `readForEdit` and `writeFileSafe` | A refused save shows the editor's normal error message |
| `ipc.js` (changed) | main | `speckit:features`, the `speckit:changed` push, and `framework` passed to `file:read` and `file:write` | Handler errors reach the renderer as a rejected promise |
| Preload | bridge | `speckitFeatures`, `onSpeckitChanged` | none |
| `SpeckitFeatures.jsx`, `SpeckitFeatureDetail.jsx` (new) | renderer | List, detail, empty state, warning, errors | A rejected call shows the error line; the last result stays |
| `ArtifactReader.jsx` (changed) | renderer | Hides Edit for `readOnly: 'speckit'` | none |

## Who opens a file

`ProjectView.jsx` renders `SpeckitShell` and passes `projectId` and an `onOpenFile(rel)` that opens the same artifact reader the AI-DLC views use, with the one file as its selection. `SpeckitShell` passes both on to `SpeckitFeatures`.

## Blast radius

- The `fileWrite.js` change touches every save in the app. It is tested so that an AI-DLC project, and a project with no framework, save exactly as before, `specs/` included.
- The `/**` watcher form is new. Existing targets keep their behaviour, and the existing watcher tests stay green.
