# Deployment Log: US-1101

| Time (2026-11-15) | Step | Result |
|---|---|---|
| 20:2x | PR #45 opened from `feat/US-1101` (with `main`, v0.2.6 fixes, merged in) | CI failed once: Prettier flagged the gitleaks report `results.sarif`; fixed by adding it to `.prettierignore` |
| 20:3x | CI on PR #45 | verify (tests, coverage, gitleaks, ESLint, Prettier), build-mac and build-linux passed |
| 20:3x | PR #45 squash-merged into `main` as `ac16b12` | merged |
| 20:3x | Repository made public on the person's word (Q1: A) | `gh api -X PATCH repos/tochman/aidlc-dash -f visibility=public` → `public` (the installed `gh` lacks `--accept-visibility-change-consequences`) |
| 20:3x | Private vulnerability reporting turned on | `gh api -X PUT …/private-vulnerability-reporting` → `enabled: true` |
| 20:3x | Feature docs: US-1101 ✅ Released in v0.2.6, every criterion ticked | committed to `main` |

**Release:** US-1101 ships with v0.2.6; the `v0.2.6` tag (which builds and publishes the packages) is set separately, after the hand check of the `.dmg`.

**Rollback:** visibility goes back with `gh api -X PATCH repos/tochman/aidlc-dash -f visibility=private`, but forks, clones and caches made while public stay. Code changes roll back by fix forward (team rule).
