# Tech Stack Decisions: U4 u4-framework-choice

Sources: `technology-stack.md` (code KB), NFR1, NFR2, NFR4 and NFR8 in `requirements.md`, contract C2 in `contract-summary.md`, and the U4 `functional-spec.md`. No new dependency.

| ID | Decision | Why |
|---|---|---|
| NFR4.4 | The PATH lookup reuses `toolPath` and `resolveOnPath` from `tools.js` for both `aidlc` and `specify`, so a saved tool path wins as it does in the Tools section. | One lookup rule in the app (BR4.2) |
| NFR8.1 | The write reuses U2's `writeProjectFile` and `FRAMEWORKS` from `projectFile.js`; `frameworkChoice.js` adds no file code of its own. | C2 has one owner (U2) |
| NFR8.2 | Tests are vitest: `main` project for detection, scan, choose and the IPC handlers; `renderer` project (jsdom, Swedish locale) for `FrameworkChoice`. Tests are written first; 80% line coverage holds. | NFR8, team practice |
| NFR1.1 | Every text, the reject reasons included, goes through `t()` with ICU placeholders, with the same keys in `sv.json` and `en.json`. | NFR1, `i18nKeys.test.js` |
| NFR2.1 | `FrameworkChoice` uses the LCARS heading, frame and colours of the project view and reuses the existing setup panels (US-0503, U3) for a missing framework. | NFR2, project rule |

Not used: any UI or state library beyond React's own state. U4 builds after U3 (`feat/US-1405`) is merged, since it reuses U3's setup panel.
