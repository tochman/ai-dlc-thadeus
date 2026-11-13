# Deployment Strategy: US-0701 i18n foundation and English

- **Branching:** trunk-based, per `org.md` Way of Working. The current branch `feat/us0406-thadeus-name` was already merged as PR #12, so this work moves to a fresh branch `feat/us0701-i18n` from `origin/main`, the same per-story pattern as earlier PRs. Open a PR to `main` and merge it once CI is green.
- **What goes in the PR:**
  - The application code, tests and dependencies from Code Generation.
  - The custom plan name fix.
  - This work's AI-DLC records.
  - The feature docs update required by `project.md`: US-0701's status marker, its acceptance criteria ticked, the EPIC-07 status line and the EPIC-07 row in `docs/FEATURES.md`.
- **Release:** none. No tag and no version bump. A later release tags it and marks US-0701 "Released in vX.Y.Z".
- **Smoke check after merge:** start `npm run dev` on `main`. The app opens in the OS language. Switching Settings → "Språk / Language" changes the view and the menu bar at once.
