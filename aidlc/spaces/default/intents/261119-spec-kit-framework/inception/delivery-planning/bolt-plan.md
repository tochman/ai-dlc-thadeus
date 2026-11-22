# Bolt Plan: EPIC-14 Spec Kit (v0.3.0)

A **Bolt** is one build pass over a piece of the work, ending in something that runs. Here each Bolt is one Unit, one branch (`feat/US-14xx`) and one squash-merged pull request. The order is value first (Q1 = A). Units are built one at a time (Q2 = A). There is no walking skeleton: by team practice, we do not build a thin first slice ahead of the planned order. Sources: the Units in `unit-of-work.md`, their dependency graph in `unit-of-work-dependency.md`, and the requirements in `requirements.md` (FR1–FR10, NFR1–NFR8).

Every Bolt shares one Definition of Done:
- tests are written first and pass, and line coverage stays at or above 80%;
- ESLint, Prettier and gitleaks are green;
- every text goes through `t()` in Swedish and English, and the views follow LCARS;
- the feature docs are updated (🚧 → ✅, "for v0.3.0").

| # | Bolt (Unit) | Story | Hypothesis: shipping it shows that… | Demo |
|---|---|---|---|---|
| 1 | U1 u1-framework-views | US-1401 | one `framework` value can replace `isAidlc` with no AI-DLC regression | An AI-DLC project opens as before; a `.specify/`-only project shows the empty Spec Kit arm |
| 2 | U2 u2-framework-file | US-1408 | the choice survives on a second clone | Clone a repo with `.thadeus/project.json` and it opens on the same framework, with no question |
| 3 | U3 u3-speckit-setup | US-1405 | `specify init` can run safely from the app, for Claude and opencode | Preview → init → `.specify/` appears; without `specify`, the install hint shows |
| 4 | U4 u4-framework-choice | US-1406 | the first open leads a person to the right framework | A new folder → choice → setup → views |
| 5 | U6 u6-speckit-features | US-1402 | Spec Kit progress can be read correctly from files alone | The features list with flow and tasks on the test project |
| 6 | U5 u5-speckit-commands | US-1403 | **success measure met:** a first feature can be started from the app | Click `/speckit-specify` → the feature appears → the next command is offered |
| 7 | U10 u10-speckit-agent-status | US-1410 | waiting questions and progress work without an audit log | The popup shows a waiting question from the hooks |
| 8 | U9 u9-feature-token-log | US-1409 | session records can be credited per feature | The Tokens view shows the active feature's cost |
| 9 | U7 u7-constitution | US-1404 | `extensions.yml` can be read with the `yaml` package | The constitution and the extension hooks are listed |
| 10 | U8 u8-framework-switch | US-1407 | switching is safe and leaves the old files untouched | Switch a project to Spec Kit and back |

Before Bolt 5, the Spec Kit test project must be made (see `external-dependency-map.md`). Its findings settle the command form (C7) and the "clarify done" signal (C5).

Bolts 2 and 3, and later Bolts 7 and 8, could run in parallel. They are built one after another anyway, as chosen.

The engine builds Units in the order of the dependency graph in `unit-of-work-dependency.md`. This plan is the intended order within that graph.
