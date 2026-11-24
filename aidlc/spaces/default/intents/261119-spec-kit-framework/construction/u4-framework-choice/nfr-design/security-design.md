# Security Design: U4 u4-framework-choice

Sources: `security-requirements.md` (NFR3.1–NFR3.3, NFR4.1, NFR4.2), `tech-stack-decisions.md` (NFR4.4, NFR8.1), the U4 `functional-spec.md`, and contracts C2 and C4 in `contract-summary.md`. The design reuses `detectProject`'s folder checks (`projectService.js`), `writeProjectFile` (`projectFile.js`, U2) and the PATH helpers in `tools.js`.

## Read-only scan

`frameworkScan(root)` and detection share one read-only helper, `foundFrameworks(root)`, moved out of `detectProject` unchanged: `aidlc` is an `aidlc/spaces/` folder with at least one space; `speckit` is a `.specify` folder entry. It calls only `stat`/`readdir`, so the scan cannot write (NFR3.1). The write-spy test covers detection, `frameworkScan` and `chooseFramework` for a missing framework.

## Tool lookup (NFR4.1, NFR4.4)

One exported helper in `tools.js`, `locateTool(name, { searchPath })`, so the rule is exact:

```js
saved = toolPaths[name]                    // only TOOL_IDS ids can have one; `specify` never does
if (saved) return (await isExecutable(saved)) ? saved : null   // a stale saved path is not found
return resolveOnPath(name, { searchPath }) // bare name only, never an absolute path
```

- `frameworkScan` reads the login PATH once (`readLoginPath()`, 20 s timeout, falls back to the app's PATH) and passes it to both lookups.
- `cli.aidlc = locateTool('aidlc') !== null`; `cli.specify = locateTool('specify') !== null`, the same PATH lookup U3's setup preview uses for `specifyOnPath`.
- Nothing is run: no `runFixed`, no `--version`. A throwing lookup is caught per tool and gives `false`.
- Tests: saved and executable, saved but deleted (stale), saved but not executable, on PATH, not on PATH, lookup throws.

## The one write (NFR3.1, NFR3.2, NFR3.3)

`chooseFramework(projectId, framework)` in this order:

1. Resolve `projectId` through the main process's open-project record; unknown id rejects with `t('errors.unknownProject')`. The renderer sends no path, and extra arguments are ignored.
2. `framework` must be in `FRAMEWORKS`; anything else rejects before any file access.
3. `foundFrameworks(root)`. Not found: return `{ ok: true, file: null, next }`, no write, no program started (NFR4.2).
4. Found: `writeProjectFile(root, framework)`. Its `{ ok: false, error }` becomes a rejection with that translated message; nothing was written.

A file that appeared between the scan and Confirm (another clone pulled in) is overwritten with the person's choice, keeping its other keys, since the person confirmed last; a newer-version file is refused by U2 and shown. The write never touches `.specify/` or `specs/`.
