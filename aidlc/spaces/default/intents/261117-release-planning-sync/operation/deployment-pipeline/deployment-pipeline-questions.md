# Deployment Pipeline Questions

Every topic is already answered by the team's affirmed practices (`team.md` → `## Deployment`, interview Q7), so nothing is asked again.

## Q1. [Release] Deployment strategy
A. Desktop release: git tag `vX.Y.Z` on `main` drives `.github/workflows/release.yml` (.dmg + .deb + SHA256SUMS, GitHub release marked latest)
X. Other (please specify)

[Answer]: A (team.md Deployment, Q7)

## Q2. [Release] Promotion gates
A. Local `.dmg` check by hand → green CI on the release pull request → merge → tag; no staging
X. Other (please specify)

[Answer]: A (team.md Deployment, Q7)

## Q3. [Release] Rollback
A. Fix forward: mark the broken release as a prerelease, ship the fix as an EPIC-00 patch, never delete the tag
X. Other (please specify)

[Answer]: A (team.md Deployment)

## Q4. [Release] Feature flags
A. None: the app has no flag system; the planning sync ships switched on
X. Other (please specify)

[Answer]: A (no flag system in the app; the requirements give no off switch)
