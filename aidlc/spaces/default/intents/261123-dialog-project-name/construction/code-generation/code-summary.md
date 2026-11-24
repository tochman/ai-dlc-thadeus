# Code Summary: US-0046

Branch `fix/US-0046` in the worktree `.claude/worktrees/fix-0046` (from `origin/main`), commit `e876bbb`. Not pushed.

## What changed

- `src/renderer/AgentDialog.jsx`: new prop `showProject` (default `false`). When it is true, a band `agent-dialog-project` above the title head shows `t('agentDialog.project', { project })`. The project comes from the existing `where.project` (`ev.projectName ?? projectNameOf(ev.projectId)`), so every page shows its own project when paging. Module and doc comments name US-0046.
- `src/renderer/App.jsx`: passes `showProject={tabs.length > 1}`.
- `src/renderer/theme.css`: `.agent-dialog-project`, an LCARS pill in `--steel-deep` and `--white` (existing theme colours, no new ones).
- `src/shared/locales/sv.json`, `en.json`: `agentDialog.project` = "PROJEKT {project}" / "PROJECT {project}".
- `tests/renderer/AgentDialog.test.jsx`: 3 tests (AC1, AC2, AC3).
- `tests/renderer/AppShell.test.jsx`: 2 tests. The app shell already opens the dialog with projects open, so Step 5 added tests there: one project gives no band, two projects show "PROJEKT other-b".
- `docs/features/epic-00-fixes.md`, `docs/FEATURES.md`: US-0046 set to 🚧 In progress, for v0.2.15. It becomes ✅ Done once Build and Test is approved.

## Red and green

| Step | Command | Red | Green |
|---|---|---|---|
| 2 | `npx vitest run --project renderer tests/renderer/AgentDialog.test.jsx` | n/a | 69 passed on the unchanged tree |
| 3–4 | same, `-t "US-0046"` | 2 failed (AC1, AC2: `Unable to find an element by: [data-testid="agent-dialog-project"]`), AC3 passed | 72 passed |
| 4 | `npx vitest run --project main tests/main/i18nKeys.test.js` | n/a | 4 passed |
| 5 | `npx vitest run --project renderer tests/renderer/AppShell.test.jsx` | 1 failed (two projects, no band), one-project test passed | AppShell and AgentDialog together: 101 passed |

## Lint and format

ESLint on the 4 changed JS/JSX files: 0 errors. Two `react-hooks/exhaustive-deps` warnings at `App.jsx` lines 159 and 178 were already there and are not in the changed lines. Prettier `--check` on all 7 changed source and test files: clean.

## Not done here

The full suite was not run, as the test instructions say. Build and Test runs it.
