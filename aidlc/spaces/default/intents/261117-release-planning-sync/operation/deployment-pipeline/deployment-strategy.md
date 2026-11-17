# Deployment Strategy

| Gate | Check | Owner |
|------|-------|-------|
| 1 | Story PR CI green (tests); ESLint and Prettier clean locally | CI / developer |
| 2 | Squash merge into `main` | person |
| 3 | Manual `.dmg` check before the v0.2.9 tag, including this work's points below | person |
| 4 | Tag `v0.2.9` → release workflow | person |
| 5 | Smoke test after publishing: three files present, an earlier install is offered the update, About shows v0.2.9 | person |

**Points to check by hand in the `.dmg` for this work:**
- The LCARS look of the "waiting to be pushed" block, the interval field in the app settings, and the docs branch field in the project settings.
- With the checkout on a story branch, add a story to a release: the checkout stays unchanged and the commit reaches `origin/main` (or the docs branch) after the interval or Push now.
- With `gh` signed in and `main` protected: the app opens the PR on the docs branch and squash-merges it.

There are no environment tiers, no canary and no feature flags. The feature is on for everyone from v0.2.9.
