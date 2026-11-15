# Health Check Report: US-1101

A desktop app with no hosted service, so health means the public repository and its releases are reachable and the gates still hold.

| Check | Status |
|---|---|
| Repository visibility | public |
| Private vulnerability reporting (`SECURITY.md` points to it) | enabled |
| CI on `main`'s last pull request (#45) | green: tests 1342 / 1342, lines 90.28 %, gitleaks, ESLint, Prettier, mac and linux builds |
| Anonymous release downloads (v0.2.5) | all three files reachable |
| Updater | still uses `gh` until US-0413 (v0.2.7); anonymous downloads now work, which US-0413 builds on |

**Open:** tag `v0.2.6` after the `.dmg` hand check; then confirm its three files are reachable anonymously.
