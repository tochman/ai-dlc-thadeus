# Logical Components: U8 u8-framework-switch

Sources: `security-design.md` and `performance-design.md` in this folder, `tech-stack-decisions.md`, the U8 `functional-spec.md` and `frontend-components.md`, and contracts C1, C2, C3 and C10 in `contract-summary.md`. Everything runs inside the one Electron app; the only failure domain is the Framework section of one project.

| Component | Process | Responsibility | NFRs it carries |
|---|---|---|---|
| `frameworkSwitch.js`: `switchTarget(projectId, to)` | main | Open-project and `to` check before any file access | NFR3.5, NFR3.6 |
| `frameworkSwitch.js`: `switchPreview(root, from, to)` | main | `setupNeeded`, `keeps`, `inProgress`, `unread`; read-only | NFR3.4, NFR3.6, NFR7.3, NFR5.1, NFR8.3 |
| `frameworkSwitch.js`: `switchFramework(root, to)` | main | Re-check `found[to]`, write through U2, return the new detection | NFR3.4, NFR3.7, NFR8.3 |
| `applyDetection(projectId, detection)` (moved out of `watchForSetup`, `ipc.js`) | main | Set `p.framework`, swap watchers, send `project:detected` | NFR7.4 |
| `writeProjectFile` (U2), `detectProject`, `loadIntentList`, `loadSpeckitFeatures` (unchanged) | main | The only write; the reads | NFR3.4, NFR5.1, NFR8.3 |
| `ipc.js` `project:switchPreview`, `project:switch`; preload | main / preload | Project id and `to` in, no path in | NFR3.6, NFR4.5 |
| `FrameworkSection.jsx`, `SwitchPreview.jsx` in Configuration | renderer | LCARS section, states, existing setup panels, texts via `t()` | NFR1.2, NFR2.2, NFR4.6, NFR7.5 |

Blast radius: a refused or failed switch leaves the file and views on the old framework and shows the reason in the section. A write followed by a failed re-detection keeps the new file and asks for a reopen. Other projects are unaffected.

Shared with other Units: `watchForSetup` keeps its behaviour and now calls `applyDetection`; its existing tests pin that. U4's `chooseFramework` may later call `applyDetection` too, but U8 does not change it.
