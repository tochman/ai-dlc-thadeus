# Deployment Pipeline Questions: US-0802 Set up AI-DLC for another harness

Sources: `.github/workflows/release.yml`, and the person's words for this plan (message f9aa1cf7: "create a PR and push, merge").

## Q1. [Release engineer] Does the pipeline need to change?

A. No. The PR job runs `npm ci`, the full suite and both builds, and there are no new dependencies
X. Other (please specify)

[Answer]: A.

## Q2. [Product owner] What does delivery mean for this story?

A. Push a branch, open a PR, merge once CI is green; no tag (the ultra-express plan's delivery)
X. Other (please specify)

[Answer]: A. "create a PR and push, merge" (message f9aa1cf7).
