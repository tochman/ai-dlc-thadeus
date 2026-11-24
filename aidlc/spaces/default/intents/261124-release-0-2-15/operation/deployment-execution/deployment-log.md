# Deployment Log: v0.2.15 (2026-11-24)

1. Release pull request #117 squash-merged as `release: v0.2.15 (#117)`, 881bbba. The person chose not to wait for CI [Q3], but `verify`, `build-mac` and `build-linux` had already passed before the merge. The pull request carried `docs/releases/0.2.15.md`, staged by blob.
2. `.dmg` hand check [Q1]: `npm run build:mac` on 881bbba in a temporary checkout produced `THADEUS-0.2.15-universal.dmg` (universal, unsigned). The person installed it and confirmed: the app starts, About shows 0.2.15, and an intent can be renamed ("It works, tag v0.2.15").
3. Tag `v0.2.15` (annotated) set on 881bbba and pushed.
4. The `release.yml` run 45343025107 failed in `verify` on its first try. The cause was a timing test, `tests/main/opencodePlugin.test.js` › "three permission.asked in the same millisecond … (SCD7)", which timed out. Nothing in this release touches the opencode plugin, and the same test passed on #117 and in the local full suite. `build-mac`, `build-linux` and `release` were skipped, so nothing was published.
   - **Recovery:** reran the failed job once (`gh run rerun --failed`). `verify`, `build-linux`, `build-mac` and `release` all succeeded.
5. Published: https://github.com/tochman/ai-dlc-thadeus/releases/tag/v0.2.15 (not a prerelease).

Rollback if needed: `gh release edit v0.2.15 --prerelease`, then fix forward as v0.2.16 (see `rollback-runbook.md`).

Follow-up: the SCD7 timing test can fail on a slow CI machine. It is worth an EPIC-00 story if it fails again.
