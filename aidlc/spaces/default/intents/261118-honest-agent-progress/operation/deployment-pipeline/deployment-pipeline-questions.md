# Deployment Pipeline Questions: US-0030

Every topic is already settled by the team's affirmed practice (`aidlc/spaces/default/memory/team.md`, `## Deployment`, Q7), so nothing was asked again. The answers below are taken from there.

## Q1. [Release engineer] Deployment strategy?

A. Desktop release by tag (no server rollout)
B. Blue/green
C. Canary
X. Other (please specify)

[Answer]: A — from team.md: a release is a git tag `vX.Y.Z` on `main`; no hosted service.

## Q2. [Release engineer] Environment promotion gates?

A. Local `.dmg` check, green CI on the release PR, merge, tag (no staging)
B. dev → staging → prod
X. Other (please specify)

[Answer]: A — from team.md (Q7).

## Q3. [Release engineer] Rollback procedure?

A. Fix forward: mark the release as a prerelease, ship the fix as the next patch
B. Re-deploy the previous version
X. Other (please specify)

[Answer]: A — from team.md.

## Q4. [Release engineer] Feature flags?

A. None; the change ships in the next release
B. A flag service
X. Other (please specify)

[Answer]: A — no feature flag system exists in the app; none is needed for this change.
