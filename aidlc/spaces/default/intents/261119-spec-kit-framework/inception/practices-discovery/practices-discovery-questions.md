# Practices Discovery Questions

Your affirmed practices in `team.md` still hold. The scan found two places where the repository has moved on since they were written. Only those two are asked.

## Q1: Hand check of the built app before a release tag

CI now runs the built-app tests (Playwright) on macOS and Linux for every pull request. `team.md` still says the built macOS `.dmg` is checked by hand before a tag, and that the published release is smoke-tested by hand afterwards. It is not clear whether the built-app tests cover the update offer or the version in About.

A. Keep both hand checks as they are (the `.dmg` check before the tag and the smoke test after publishing)
B. Drop the `.dmg` check before the tag, because the built-app tests replace it; keep the smoke test after publishing
C. Drop both hand checks
X. Other (please specify)

[Answer]: A

## Q2: Secret scan on every pull request

gitleaks now scans every pull request in the `verify` job of CI and blocks the merge when it finds a secret. `team.md` does not mention it.

A. Write it down as a team practice: the secret scan runs on every pull request and blocks the merge
B. Leave it out of the team practices; it is just part of CI
X. Other (please specify)

[Answer]: A
