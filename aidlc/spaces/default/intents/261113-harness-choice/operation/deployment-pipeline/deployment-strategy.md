# Deployment Strategy: US-0801 Choose the harness per project

- **Branching:** trunk-based, per `org.md`. The work lives on a fresh branch `feat/us0801-harness-choice` from `origin/main`. The current branch `feat/us0701-i18n` was already merged as PR #13. A PR goes to `main` and is merged with a merge commit once CI is green, as earlier stories were.
- **What goes in the PR:**
  - the code and tests from Code Generation;
  - this work's AI-DLC records and the updated code map;
  - US-0701's Deployment Execution records, which were written after its merge;
  - the new EPIC-09 file, with US-0206 linked to US-0904;
  - the feature docs update for US-0801 that `project.md` requires: its status marker, its acceptance criteria ticked, the EPIC-08 status line and the EPIC-08 row in `docs/FEATURES.md`.
- **Release:** none. A later release tags it.
- **Smoke check after merge:** `npm run dev` → Projektinställningar → Agent-terminal → opencode. The agent tab restarts as "opencode", and the Claude Code choice still works.
