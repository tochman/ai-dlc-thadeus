# Frontend Components: U6 u6-speckit-features

All in the LCARS frame (`Frame`, `lcars-heading`), as in `SpeckitShell.jsx` and the AI-DLC views.

| Component | Role | Props and state |
|---|---|---|
| `SpeckitShell.jsx` (changed) | Renders `SpeckitFeatures` in place of the empty text. | none |
| `SpeckitFeatures.jsx` (new) | Calls `speckit:features`, refreshes on `speckit:changed`, shows the version warning, the list or the empty state, and the errors. | Props: `projectId`, `onOpenFile`. State: `result`, `selected` (folder name), `loading` |
| `SpeckitFeatureDetail.jsx` (new) | The flow with the "worked out from the files" note, the tasks by phase (rounds for Convergence) with ID, `[P]`, `[USn]` and tick, the done/total count and skipped lines, and the files. | Props: `feature`, `onOpenFile` |
| Artifact reader | Opens a feature file read-only (`ArtifactReader.jsx`, unchanged). | none |
| Preload / bridge | `speckitFeatures(projectId)`, `onSpeckitChanged(cb)` | none |

Interaction:
- A click on a list row selects it. The selection stays after a refresh while the folder still exists, otherwise it goes to the active feature.
- A click on a file calls `onOpenFile(path)`.
- The empty-state button sends `/speckit-specify ` to the agent terminal; nothing runs without the click.

Test ids:
- `speckit-features-root`, `speckit-features-row`, `speckit-features-active`
- `speckit-features-empty`, `speckit-features-specify`
- `speckit-features-version-warning`, `speckit-features-errors`
- `speckit-feature-flow`, `speckit-feature-flow-note`, `speckit-feature-tasks`, `speckit-feature-count`, `speckit-feature-file`

Keys added in both sv and en (ICU placeholders):
- `speckit.features.title`, `speckit.features.active`, `speckit.features.empty`, `speckit.features.specify`
- `speckit.features.versionWarning` (`{version}`), `speckit.features.versionUnknown`
- `speckit.features.errors`, `speckit.features.flowNote`
- `speckit.features.step.spec`, `.clarify`, `.plan`, `.tasks`, `.implement`, `.converge`
- `speckit.features.count` (`{done}`, `{total}`), `speckit.features.skipped` (`{count}`), `speckit.features.round` (`{round}`), `speckit.features.files`
