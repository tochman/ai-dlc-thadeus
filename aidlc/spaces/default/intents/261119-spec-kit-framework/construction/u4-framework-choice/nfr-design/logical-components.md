# Logical Components: U4 u4-framework-choice

Sources: `security-design.md` and `performance-design.md` in this folder, `tech-stack-decisions.md`, the U4 `functional-spec.md`, and contracts C1, C2 and C4 in `contract-summary.md`. Everything runs inside the one Electron app; the only failure domain is the choice screen of one project.

| Component | Process | Responsibility | NFRs it carries |
|---|---|---|---|
| `foundFrameworks(root)` (moved out of `detectProject`) | main | Read-only folder checks, shared by detection and the scan | NFR3.1 |
| `locateTool(name, { searchPath })` (new export, `tools.js`) | main | Saved path if executable, else bare-name PATH lookup; runs nothing | NFR4.1, NFR4.4 |
| `frameworkChoice.js`: `frameworkScan(root)` | main | `found`, `cli`, `proposal` (BR4.2, BR4.3) | NFR3.1, NFR4.1, NFR4.3 |
| `frameworkChoice.js`: `chooseFramework(root, framework)` | main | Validate, write through U2 or return the setup step, push detection | NFR3.1, NFR3.2, NFR4.2, NFR7.1, NFR8.1 |
| `writeProjectFile` (U2, unchanged) | main | The only write, atomic | NFR3.1, NFR8.1 |
| `ipc.js` `project:frameworkScan`, `project:chooseFramework`; preload | main / preload | Project id in, no path in, fixed `file` out | NFR3.3 |
| `FrameworkChoice.jsx` in the project view | renderer | LCARS screen, states, U3/US-0503 setup panels, texts via `t()` | NFR1.1, NFR2.1, NFR7.2 |

Blast radius: a failed scan or write shows its reason on the choice screen with Retry; nothing is written, so the next open shows the screen again. Other projects and views are unaffected.

Shared with other Units: `detectProject` (U1/U2, behaviour unchanged except BR4.1's `ask` for a missing file, which its tests pin) and `tools.js` (one new export; the Tools section keeps its own `toolRow`).
