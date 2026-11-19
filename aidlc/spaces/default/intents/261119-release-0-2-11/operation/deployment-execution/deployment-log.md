# Deployment Log — v0.2.11 (2026-11-19)

| Step | What | Evidence |
|---|---|---|
| 1 | Release PR opened from `release/v0.2.11` | PR #83 |
| 2 | CI on the PR: first `verify` failed on a `ConfigView` timing flake; the re-run passed every job | run 44493320868 |
| 3 | `.dmg` checked by hand (FR3, FR4): About 0.2.11, US-0032 rule line and one-commit criterion, US-0033 commit subjects | `deployment-execution-questions.md` Q1: A |
| 4 | Hand checks recorded on the PR (US-0032 AC3 and the release checklist ticked); CI green | `aab27c8` |
| 5 | Squash-merged into `main` (FR5) | `2f90c84 release: v0.2.11 (#83)` |
| 6 | Tag `v0.2.11` on `2f90c84`, pushed | `refs/tags/v0.2.11` |
| 7 | `release.yml` published a regular release, marked Latest, with `--generate-notes` | run 44496935705, https://github.com/tochman/ai-dlc-thadeus/releases/tag/v0.2.11 |

## Rollback (NFR2)

Fix forward. If v0.2.11 is broken: `gh release edit v0.2.11 --prerelease` stops the updater from offering it; the fix becomes an EPIC-00 story and ships as v0.2.12. The tag stays.
