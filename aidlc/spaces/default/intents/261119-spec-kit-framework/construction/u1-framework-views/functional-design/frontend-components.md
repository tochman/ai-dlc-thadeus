# Frontend Components: U1 u1-framework-views

| Component | Change | Props and state |
|---|---|---|
| `src/shared/frameworkViews.js` (new, pure) | Exports the views table by framework (BR1.5, BR1.6) and `sectionsFor(framework)`, used for project settings. | none |
| `App.jsx` | Replaces `isAidlc` and `offered` (around lines 398–401) with `detection.framework` and `detection.views`. The first label is `app.intents` for aidlc, `app.specs` for speckit and `app.setup` for null. The foot label shows the intent count for aidlc and the feature count for speckit, which stays 0 until U6. | reads `active.detection` |
| `ProjectView.jsx` | Its `offered` map (line 360) and the `isAidlc` branches read the table. The AI-DLC-only parts (intents list, AddHarness, docs setup) render for aidlc only. For speckit it renders `SpeckitShell` in the first arm slot. | `project.detection` |
| `SpeckitShell.jsx` (new) | An LCARS panel: a heading (`speckit.title`), the line "No features read yet", and the version note, filled by U6. `data-testid="speckit-shell-root"`. | none |
| Menu (`menu.js` via `sendMenuState`) | `{ hasProject, framework, showFeatures }`. The `STATE_KEYS` whitelist is updated, and cost and github are shown for aidlc only. | none |
| Main side: `projectService.js`, `ipc.js`, `harnesses.js` | `detectProject(root, { saved, askWhenBoth })` returns the Detection shape. `project:open` and `watchForSetup` act on a framework change. `watchForAidlc` also sees `.specify/`. The opencode markers gain `.opencode`. | none |

Interaction: there are no new user actions in U1. Arm navigation works as it does today, with the view ids taken from the table.

New i18n keys, in sv and en: `app.specs`, `speckit.title`, `speckit.empty`, `app.featureCount`.
