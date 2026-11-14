# Deployment log: v0.2.4

Target: GitHub Releases (`tochman/aidlc-dash`). There are no servers, databases or AWS resources.

| Time (2026-11-14, CET) | Step | Result |
|------|------|--------|
| ~12:30 | Branch `release/v0.2.4` cut from `main` (`0293db3`); `package.json` bumped to 0.2.4 | done |
| ~12:35 | First local build: "No space left on device" | failed; old dmgs deleted [Q1: A], rebuilt |
| ~12:40 | Person's check of the local `.dmg` [Q2] | About, Plans, Monaco pass; token wave invisible, Resume looked active |
| 12:55 | EPIC-00 US-0008 (wave from the first reading) and US-0009 (Resume waits for an agent outside the app) fixed, rebuilt | built |
| 14:55 | Person's check [Q3] | Resume still amber; cause: `.resume-button` had no disabled style |
| 14:59 | Grey disabled style added (`theme.css`), rebuilt | built |
| ~15:02 | Person's check [Q4] | passes: "nu fungerar allt" |
| 15:03 | Feature docs marked "Released in v0.2.4", release checklist ticked, 353 tests pass | done |
| 15:04 | Commit `23de06d`, PR #30 | opened |
| 15:07 | PR run of `release.yml` (`43602914746`): verify, build-mac, build-linux | green |
| 15:07 | PR #30 squash-merged to `main` (`2d111d6`), tag `v0.2.4` pushed | done |
| 15:10 | Tag run of `release.yml` (`43603209241`) | green; release published 14:10:53Z as "Latest" |

## Deviations from `deployment-strategy.md`

- Step 1 took three rounds of local builds instead of one. The two EPIC-00 fixes went onto the release branch rather than through separate PRs to `main` first, so they ship in the same release PR.
- Not part of the release: the uncommitted model settings (`.claude/agents/*`, `aidlc.settings.json`). They stay in the working tree.
