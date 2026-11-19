# Constraint Register: EPIC-14 Spec Kit

Derived from the intent statement (`ideation/intent-capture/intent-statement.md`), `feasibility-questions.md` and the codebase.

| ID | Kind | Constraint | Source |
|---|---|---|---|
| C1 | Product | One framework per project, AI-DLC or Spec Kit, never both | EPIC-14 decision, 2026-11-19 |
| C2 | Technical | The chosen framework is kept in the repository so every clone follows it | Q2 |
| C3 | Technical | Spec Kit projects are supported with Claude Code and opencode | Q5 |
| C4 | Technical | Any Spec Kit version is accepted; what the app cannot read is named, never hidden | Q4 |
| C5 | Technical | A Spec Kit project keeps one token log per feature | Q3 |
| C6 | Technical | The app never writes in `.specify/` or `specs/`; it only reads them | US-1402 |
| C7 | Technical | CLIs run with fixed arguments, no shell, from the login shell's `PATH`; the app never installs `specify` | `src/main/exec.js`, US-1405 |
| C8 | Team | Test first (TDD), 80% line coverage, ESLint and Prettier in CI; every text through `t()` in Swedish and English; LCARS look | `team.md`, `project.md` |
| C9 | Plan | All seven stories in v0.2.11 | Q1 |
| C10 | Organisational | No licence, policy or outside dependency limits this work | Q6 |

No regulatory or data-residency constraints: the app is a local desktop tool and sends nothing new outside the machine.

## Assumptions & Open Questions

None.
