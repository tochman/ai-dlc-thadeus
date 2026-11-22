# Deployment Pipeline Questions: v0.2.14

No questions were needed. The pipeline, the gates and the rollback come from team.md § Deployment and `.github/workflows/release.yml`, unchanged in this release. Two decisions were taken earlier in the workflow (audit log): v0.2.14 reaches `main` as one release pull request with each story kept as its own commit (a one-off exception to one-PR-per-story), and the hand check of the `.dmg` before the tag is skipped this time.
