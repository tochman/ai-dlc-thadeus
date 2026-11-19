# Deployment Log — v0.2.10 (2026-11-19)

| Step | Result | Evidence |
|---|---|---|
| Release PR #80 (`release/v0.2.10`): version bump + "Released in v0.2.10" markers | CI green twice (runs 44469193059, 44470498583) | PR #80 |
| `.dmg` from `build-mac` artifact (`gh run download 44469193059 -n mac`) | `THADEUS-0.2.10-universal.dmg` | `dist/v0.2.10-check/` (git-ignored) |
| Hand checks FR3.1–FR3.6 and About shows 0.2.10 (FR4) | all pass, the person's answer "All pass" | `deployment-execution-questions.md` Q1 |
| Squash-merge #80 | `7d99566 release: v0.2.10 (#80)` on `main` | |
| Tag `v0.2.10` on 7d99566, pushed | Release workflow run 44471318876: verify, build-mac, build-linux, release all success | |
| Published | regular release, Latest, not draft, not prerelease | https://github.com/tochman/ai-dlc-thadeus/releases/tag/v0.2.10 |

The tag's `verify` passed, so no "for v0.2.10" marker was left (the v0.2.9 lesson held).

**Rollback (NFR2):** fix forward. If the release is broken: `gh release edit v0.2.10 --prerelease` stops the updater offering it; the fix becomes an EPIC-00 story shipped as v0.2.11; the tag stays.
