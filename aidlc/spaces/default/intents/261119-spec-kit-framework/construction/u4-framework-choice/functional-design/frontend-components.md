# Frontend Components: U4 u4-framework-choice

All in the LCARS frame, in the project view where the setup panels sit today.

| Component | Role | Props and state |
|---|---|---|
| `FrameworkChoice.jsx` (new) | Calls `frameworkScan`, shows the two frameworks with found and PATH status, preselects the proposal, confirms through `chooseFramework`, shows the setup panel for a missing framework, and saves after its success. Replaces U3's simple choice. | Props: `projectId`, `root`, `setupProps` (for `SetupAidlc`). State: `scan`, `picked`, `phase` (scanning, scanFailed, choosing, setup, saving), `error` |
| `ProjectView.jsx` (changed) | Renders `FrameworkChoice` when `framework === null`, in place of the setup choice and panels. | none |
| `SetupAidlc.jsx`, `SetupSpeckit.jsx` (U3) | Shown inside `FrameworkChoice`; their `onApplied` triggers the save (BR4.6). | unchanged |
| Preload / bridge | `frameworkScan(projectId)`, `chooseFramework(projectId, framework)` | none |

Interaction:
- One choice at a time (two LCARS option blocks, AI-DLC and Spec Kit), each showing "found in this project" or "not found" and its tool "on the PATH" or "not on the PATH".
- The proposal is preselected; Confirm saves it in one click. With both or neither found, nothing is preselected and Confirm waits for a pick.
- In setup, a Back button returns to the choice without writing.

Test ids:
- `framework-choice-root`, `framework-choice-option-aidlc`, `framework-choice-option-speckit`, `framework-choice-confirm`, `framework-choice-back`, `framework-choice-error`, `framework-choice-retry`

Keys added in both sv and en (ICU placeholders):
- `frameworkChoice.title`, `.intro`, `.found`, `.notFound`, `.cliFound` (`{tool}`), `.cliMissing` (`{tool}`), `.proposed`, `.confirm`, `.back`, `.retry`, `.scanFailed` (`{reason}`), `.saveFailed` (`{reason}`)
