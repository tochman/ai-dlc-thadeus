# Frontend Components: U7 u7-constitution

All in the LCARS frame and the Configuration view's look, as the AI-DLC section is. Placement: Configuration › Spec Kit (Q1 = A).

| Component | Role | Props and state |
|---|---|---|
| `frameworkViews.js` (changed) | `sectionsFor('speckit')` adds `speckit`, so the arm shows the section (BR7.9). | none |
| `ProjectView.jsx` (changed) | Renders `SpeckitRules` when the section is `speckit`; passes its editor open. | none |
| `SpeckitRules.jsx` (new) | Calls `speckit:rules`, refreshes on `speckit:changed`; shows the constitution, the extensions and the errors. | Props: `projectId`, `onEdit(rel)`. State: `result`, `loading`, `error` |
| `FileView` (ArtifactReader.jsx, unchanged) | Renders the constitution read-only in the section. | none |
| Preload / bridge | `speckitRules(projectId)`; `onSpeckitChanged(cb)` (U6) | none |

Interaction:
- Open in editor calls `onEdit('.specify/memory/constitution.md')`, which opens the editor view on that file.
- With no constitution, the button sends `/speckit-constitution ` to the agent terminal; nothing runs without the click.
- Each extension shows its id, its commands, then its hooks as rows: when (before/after), target, command, mode, and the condition note when set.

Test ids:
- `speckit-rules-root`, `speckit-rules-constitution`, `speckit-rules-edit`, `speckit-rules-no-constitution`, `speckit-rules-constitution-run`
- `speckit-rules-extension`, `speckit-rules-command`, `speckit-rules-hook`, `speckit-rules-skipped`, `speckit-rules-unchecked`, `speckit-rules-errors`

Keys added in both sv and en (ICU placeholders):
- `settings.project.sections.speckit`
- `speckit.rules.constitution`, `.edit`, `.noConstitution`, `.runConstitution`
- `speckit.rules.extensions`, `.noExtensions`, `.commands`, `.hooks`, `.condition`
- `speckit.rules.when.before`, `.when.after`, `speckit.rules.mode.optional`, `.mode.mandatory`, `.mode.off`
- `speckit.rules.skipped` (`{count}`), `speckit.rules.unchecked`, `speckit.rules.errors`
