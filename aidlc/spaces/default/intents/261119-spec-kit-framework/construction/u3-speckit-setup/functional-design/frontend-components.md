# Frontend Components: U3 u3-speckit-setup

| Component | Role | Props and state |
|---|---|---|
| `SetupSpeckit.jsx` (new) | An LCARS panel that mirrors `SetupAidlc.jsx`. It covers the preview, the missing-CLI hint with Retry, the harness picker, the command shown before confirm, Run, and the output. | Props: `projectId`. State: `info`, `harness`, `phase` (one of previewing, missingCli, ready, running, done, failed), `result` |
| Setup view (where `SetupAidlc` renders for `framework: null`) | Gains a choice between AI-DLC and Spec Kit that opens `SetupSpeckit`. U4 later replaces this choice with the first-open screen. | none |
| Preload / bridge | `speckitSetupPreview(projectId)`, `speckitSetup(projectId, harness)` | none |

Test ids:
- `setup-speckit-root`
- `setup-speckit-hint`
- `setup-speckit-retry`
- `setup-speckit-harness`
- `setup-speckit-command`
- `setup-speckit-run`
- `setup-speckit-output`

The keys below are added in both sv and en:
- `speckitSetup.title`
- `speckitSetup.missing`
- `speckitSetup.installHint`
- `speckitSetup.retry`
- `speckitSetup.pickHarness`
- `speckitSetup.willRun`
- `speckitSetup.run`
- `speckitSetup.running`
- `speckitSetup.done`
- `speckitSetup.failed`
- `speckitSetup.timeout`
- `setup.chooseFramework`
