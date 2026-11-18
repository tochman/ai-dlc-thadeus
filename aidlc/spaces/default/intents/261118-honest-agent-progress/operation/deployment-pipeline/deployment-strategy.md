# Deployment Strategy: US-0030

- **Strategy:** desktop release by tag. US-0030 is one squash-merged pull request into `main` and ships in v0.2.10 with the other stories of that release.
- **Gates (team.md Q7, in order):** the local `.dmg` check by hand; green CI on the release pull request; the merge; the tag.
- **Feature flags:** none. The new row texts appear for everyone on the release; no setting turns them off.
- **Data:** no stored data or schema changes; the hook event shape only gains optional fields, so an older app reading the same channel ignores them.
- **Security note:** the change lets two bounded agent texts (task and tool description, ≤ 80 chars, cleaned, outside paths hidden) into the UI, relaxing US-0214's identifiers-only rule on purpose (requirements NFR1). Nothing leaves the machine.
- **Smoke test after release (manual):** start an agent in the app; its row shows the task and what it does; a background permission request shows on that agent's row while main says "waiting for <agent>"; a quiet row shows "seen N ago".
