# Deployment Execution Questions: US-0801 Choose the harness per project

Sources: `deployment-strategy.md` (approved), `test-results.md`.

## Q1. [Release engineer] Are the pre-deployment checks passing?

A. Yes: the build exits 0 and the full suite passes 150/150 (Build and Test, approved)
X. Other (please specify)

[Answer]: A.

## Q2. [Developer] Are database migrations needed?

A. No. The only new stored value is `harness` in the app's own settings.json
X. Other (please specify)

[Answer]: A.

## Q3. [Release engineer] Are dependent services available?

A. Only GitHub, for the push, the PR and CI
X. Other (please specify)

[Answer]: A.

## Q4. [Product owner] When does it go out?

A. Now: push, PR, merge once CI is green, no tag (approved in Deployment Pipeline)
X. Other (please specify)

[Answer]: A.
