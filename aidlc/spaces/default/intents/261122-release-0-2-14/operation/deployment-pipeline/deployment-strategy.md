# Deployment Strategy: v0.2.14

A desktop app, released by tag, with no staging (team.md § Deployment).

1. **Release branch** `release/v0.2.14`: every story (US-0037, US-0038, US-0039, US-0040, US-0041, US-0042, US-0905, US-0417, US-0416, US-1203) as its own commits and the README with new screenshots and GIF; then merge `origin/main` in (docs from `main`), bump `package.json` to 0.2.14, mark every story "Released in v0.2.14" (story markers, epic Status lines, FEATURES.md rows, release-plan table) and tick the release checklist; stage `docs/releases/0.2.14.md` by blob if the app removed it from the branch's tree; check `git diff --stat origin/main HEAD -- docs/`.
2. **Release PR** `release: v0.2.14 (#NN)`: green CI, then merge with a merge commit so the story commits stay (decided for this release).
3. **Tag** `v0.2.14` on the merge commit and push it. No hand check of the `.dmg` first (decided for this release).
4. **Smoke test** after `release` publishes: the three files are present and the checksums match; About shows 0.2.14; an earlier install is offered the update.
5. **Close the intent record** on `main` (project rule): the record, `intents.json`, codekb, `.thadeus/`; remove the worktrees under `.claude/worktrees/`.
