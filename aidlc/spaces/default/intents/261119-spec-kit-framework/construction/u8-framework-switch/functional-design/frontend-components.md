# Frontend Components — u8-framework-switch

Sources: `functional-spec.md` (W1 and its states), `rules.md`, `unit-of-work.md` U8, C10 in `contract-summary.md`.
LCARS look and the arm navigation (NFR2): a new `framework` section in the project's Configuration, shown for both
frameworks, beside the existing sections. Every text through `t()` in `sv` and `en`.

| Component | Role | State and props | data-testid |
|---|---|---|---|
| `FrameworkSection` | The section: current framework, the switch button, the preview, progress and result | `{ projectId, framework, harness }`; local state `idle \| preview \| setup \| writing \| failed` | `framework-section` |
| `SwitchPreview` | Shows the C10 preview: setup line, views line, kept files, work in progress list | `{ preview, onConfirm, onCancel }` | `framework-switch-preview` |

## Interaction

- Switch button (`framework-switch-button`): disabled while any step runs; label names the other framework.
- Preview: setup line only when `setupNeeded`; work in progress as a list of `kind` and `name`, or "none"; Confirm
  (`framework-switch-confirm`) and Cancel (`framework-switch-cancel`).
- Setup: reuses the existing setup components (the AI-DLC setup page, the Spec Kit setup output). No new setup UI.
- Result: on error, the message and that the project stays on the old framework (`framework-switch-error`); on
  success, the section shows the new framework.

## Integration points

- `project:switchPreview` and `project:switch` (C10), new in `ipc.js` and the preload.
- `speckit:setup` (C3) and `setup:run` (US-0503) for the setup step.
- The C1 `project:detected` push already drives the arm and views (U1).
