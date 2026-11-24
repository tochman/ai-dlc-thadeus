# Frontend Components: U10 u10-speckit-agent-status

All in the LCARS frame and the look of the Specs view. Placement: at the top of the Specs view (Q1 = A).

| Component | Role | Props and state |
|---|---|---|
| `SpeckitProgress.jsx` (new) | Calls `agents:progress`, refreshes on a hook push and `speckit:changed`; one LCARS readout. | Props: `projectId`. State: `result`, `loading`, `error` |
| `SpeckitShell.jsx` or `SpeckitFeatures.jsx` (changed) | Renders `SpeckitProgress` above the features list. | none |
| `AgentDialog.jsx` (changed) | A hook page shows the "from the agent hooks" note. | none |
| Preload / bridge | `getAgentProgress(projectId)` (existing call, new form); `onSpeckitChanged(cb)` (U6); the existing agent events push | none |

Interaction:
- Read only: no buttons. The waiting question's text is shown as plain text, not Markdown.
- The popup still opens only when a question arrives (Q2 = A).

Test ids:
- `speckit-progress-root`, `speckit-progress-waiting`, `speckit-progress-feature`, `speckit-progress-empty`, `speckit-progress-error`
- `agent-dialog-source-hooks`

Keys added in both sv and en (ICU placeholders):
- `speckit.progress.title`, `.waiting` (`{question}`, `{agent}`), `.feature` (`{name}`, `{done}`, `{total}`)
- `speckit.progress.fromHooks`, `.fromTasks`, `.nothingYet`, `.failed`
- `agentDialog.sourceHooks`
