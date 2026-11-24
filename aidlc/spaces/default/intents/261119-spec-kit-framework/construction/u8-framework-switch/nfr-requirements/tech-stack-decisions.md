# Tech Stack Decisions: U8 u8-framework-switch

Sources: `technology-stack.md` (code KB), NFR1, NFR2, NFR4, NFR5 and NFR8 in `requirements.md`, contracts C1, C2, C3 and C10 in `contract-summary.md`, and the U8 `functional-spec.md` and `frontend-components.md`. No new dependency.

| ID | Decision | Why |
|---|---|---|
| NFR8.3 | The write reuses U2's `writeProjectFile` and `FRAMEWORKS`; the folder check reuses detection's own `found` check (U1); the work-in-progress list reuses the existing intents reader and U6's Spec Kit features reader. U8 adds no file or parsing code of its own. | One owner per contract (C1, C2); BR8.2, BR8.3 |
| NFR5.1 | The Spec Kit part of the preview reads features through U6's reader, so a newer Spec Kit version or a feature it cannot read gives the same warning there, and the preview says one list could not be read. | NFR5, functional-spec edge cases |
| NFR4.6 | The setup step calls the existing `setup:run` and `speckit:setup` handlers from the renderer, with the project's harness; U8 adds no IPC for running commands. | NFR4, C3, BR8.4 |
| NFR8.4 | Tests are vitest: `main` project for `switchPreview`, `switch` and the IPC handlers; `renderer` project (jsdom, Swedish locale) for `FrameworkSection` and `SwitchPreview`. Tests are written first; 80% line coverage holds. | NFR8, team practice |
| NFR1.2 | Every text, the reject reasons and the preview lines included, goes through `t()` with ICU placeholders, with the same keys in `sv.json` and `en.json`. | NFR1, `i18nKeys.test.js` |
| NFR2.2 | `FrameworkSection` is a section of the project's Configuration with its LCARS heading, frame and colours, and reuses the existing setup panels for the setup step. | NFR2, project rule |

Not used: any UI or state library beyond React's own state. U8 builds after U4 (`chooseFramework`) and U6 (the features reader) are merged.
