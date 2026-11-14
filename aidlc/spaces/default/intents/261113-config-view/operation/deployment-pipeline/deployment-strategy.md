# Deployment Strategy: US-0901 See a project's AI-DLC configuration

- **Branching:** a fresh branch `feat/us0901-config-view` from `main` (at `306a47d`, v0.2.1). The PR goes to `main` and is merged with a merge commit once CI is green.
- **What goes in the PR:**
  - the code and tests;
  - this work's AI-DLC records, plus the pending audit update from US-0802;
  - the feature docs: US-0901's marker and its ticked acceptance criteria, the EPIC-09 status line, the EPIC-09 row in `FEATURES.md`, and US-0803 (added on the person's request on 2026-11-14) in EPIC-08 and `FEATURES.md`.
- **Left out:** the untracked `.aidlc/` folder (opencode installed in this project while testing). It is the person's to commit or remove.
- **Release:** none.
- **Smoke check after merge:** in `npm run dev`, open this project and choose **Konfiguration**. All six sections should show values, the picker should list Claude Code and opencode, and switching the picker should reload the models section.
