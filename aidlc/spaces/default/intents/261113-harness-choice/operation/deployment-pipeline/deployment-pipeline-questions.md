# Deployment Pipeline Questions: US-0801 Choose the harness per project

Sources: `.github/workflows/release.yml`, and the way the person had the previous story delivered (US-0701, message f9aa1cf7: "create a PR and push, merge").

## Q1. [Release engineer] Does the pipeline need to change?

A. No. The PR job already runs `npm ci`, the full test suite and both builds; this work adds no dependencies
X. Other (please specify)

[Answer]: A. **Mode:** taken from the workflow file.

## Q2. [Product owner] What does delivery mean for this story?

A. Push a branch, open a PR, and merge it once CI is green; no version tag (same as US-0701)
B. Also tag a release
X. Other (please specify)

[Answer]: A. Same delivery as the previous story; the person can change it at this stage's approval.
