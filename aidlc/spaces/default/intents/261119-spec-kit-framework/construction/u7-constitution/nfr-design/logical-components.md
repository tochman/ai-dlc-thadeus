# Logical Components: U7 u7-constitution

Sources: `tech-stack-decisions.md`, `security-design.md` and `performance-design.md` in this folder, the U7 `functional-spec.md`, and contract C6 in `contract-summary.md`. Everything runs inside the one Electron app; the only failure domain is a single project's Spec Kit section.

| Component | Process | Responsibility | NFRs it carries |
|---|---|---|---|
| `readLimited` (U6, exported, now via `resolveInRoot`) | main | Contained, 1 MB, UTF-8 read | NFR3.2, NFR5.2 |
| `speckitRules.js`: `loadSpeckitRules(root)` | main | Builds the C6 result; every failure becomes an `errors` entry | NFR3.1, NFR3.2, NFR3.3, NFR7.3 |
| `speckitRules.js`: `hooksFrom(config)` | main (pure) | Hooks, modes and skipped count (BR7.4, BR7.5) | NFR3.3 |
| `yaml` package | main | Parsing with default limits | NFR5.2, NFR8.1 |
| `SPECKIT_WATCH_PATHS` + `watchFiles` | main | Refresh pushes, shared with U6 | NFR7.1, NFR7.2 |
| `ipc.js` `speckit:rules`, preload `speckitRules` | main / preload | Spec Kit projects only; root-relative paths out | NFR3.4 |
| `SpeckitRules.jsx` in Configuration › Spec Kit | renderer | LCARS section; texts via `t()`; constitution via `FileView` | NFR1.1, NFR2.1, NFR5.1, NFR7.4 |

Blast radius: a bad file in `.specify/` gives an `errors` entry in this section only. `loadSpeckitRules` never throws for file content; a thrown error (a bug) rejects the call and the view shows its failed state, as in the functional spec's screen states. Other views and U6's features list are unaffected.

Nothing shared with other Units changes except `readLimited` (now exported and contained) and `SPECKIT_WATCH_PATHS` (three paths added); U6's tests pin both.
