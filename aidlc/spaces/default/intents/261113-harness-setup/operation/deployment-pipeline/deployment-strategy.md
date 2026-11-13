# Deployment Strategy: US-0802 Set up AI-DLC for another harness

- **Branching:** a fresh branch `feat/us0802-harness-setup` from `origin/main`. The current branch, `feat/us0801-harness-choice`, was merged as PR #14. A PR goes to `main` and is merged with a merge commit once CI is green.
- **What goes in the PR:**
  - the code and tests;
  - this work's AI-DLC records;
  - US-0801's Deployment Execution and skip records, which were written after its merge;
  - the feature docs update for US-0802: its marker, its acceptance criteria ticked (the "typed into the shell tab" criterion is reworded to say the app runs setup itself, as decided), the EPIC-08 status line and the EPIC-08 row in `FEATURES.md`.
- **Release:** none.
- **Smoke check after merge:** in `npm run dev`, set up a scratch folder with opencode, then add Claude Code to it from Projektinställningar.
