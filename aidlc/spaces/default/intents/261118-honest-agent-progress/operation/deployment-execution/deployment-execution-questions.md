# Deployment Execution Questions: US-0030

Settled by evidence and the team's practice, so nothing was asked again.

## Q1. [Release engineer] Are all pre-deployment checks passing?

A. Yes: build, full suite, coverage, ESLint and Prettier passed in Build and Test
B. No
X. Other (please specify)

[Answer]: A — `construction/build-and-test/test-results.md`.

## Q2. [Developer] Are database migrations required?

A. No; no stored data or schema changes
B. Yes
X. Other (please specify)

[Answer]: A.

## Q3. [Release engineer] Are dependent services available?

A. Not applicable; a desktop app with no hosted services
B. Yes
X. Other (please specify)

[Answer]: A.

## Q4. [Release engineer] Deployment window?

A. The v0.2.10 release, after the story's pull request merges (team.md: release by tag)
B. Now, as its own release
X. Other (please specify)

[Answer]: A.
