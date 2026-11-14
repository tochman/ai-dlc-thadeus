# Deployment Pipeline Questions: US-0901 See a project's AI-DLC configuration

Sources: `.github/workflows/release.yml`, and the person's standing instruction for EPIC-09 on the ultra-express plan (2026-11-13): push, PR, merge once CI is green, no tag.

## Q1. [Release engineer] Does the pipeline need to change?

A. No. The PR job runs `npm ci`, the full suite and both builds, and there are no new dependencies
X. Other (please specify)

[Answer]: A.

## Q2. [Product owner] What does delivery mean for this story?

A. Push a branch, open a PR, merge once CI is green; no tag (the ultra-express plan's delivery)
X. Other (please specify)

[Answer]: A. This is the person's standing instruction for EPIC-09 on ultra-express (2026-11-13).
