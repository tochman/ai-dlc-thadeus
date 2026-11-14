# Practices Discovery questions

The draft in `team-practices.md` is built from the git history, `release.yml`, `package.json`, the release plans and the code knowledge base. These questions cover only what that evidence could not settle.

## Q1. [Quality] When are tests written for new work?

Today tests come after the code (test-after), but that is the framework default, not a choice the team has made.

A. Keep writing tests after the code, layer by layer
B. Test first (TDD): write a failing test, then the code
C. Mixed: acceptance scenarios first, unit tests after the code
X. Other (please specify)

[Answer]: B
**Mode:** guided

## Q2. [Quality] Should CI measure test coverage and require 80% line coverage?

The classic plan expects an 80% line-coverage floor checked in CI. No coverage tool is installed today, so the floor cannot be checked.

A. Yes: add a coverage tool (vitest's own `@vitest/coverage-v8`) and require 80% in CI now
B. Measure and report coverage in CI, but do not fail the build on it yet
C. Not now: keep the green test suite as the only gate
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q3. [Developer] Should a linter or formatter check the code style?

There is no ESLint or Prettier config. Style is kept by hand.

A. Add ESLint and Prettier, and run them in CI
B. Add Prettier only (formatting), no lint rules
C. Keep style by hand
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q4. [Release engineer] Build a thin end-to-end slice first?

A walking skeleton is a minimal version that runs the whole way through, built first to prove the pieces connect before the real features go in. For this work that would be, for example, one Claude Code question travelling from its hook to the dialog and the answer back, before anything else.

A. Yes, build the thin slice first and check it in the app before the rest
B. No, build the pieces in the planned order
X. Other (please specify)

[Answer]: B
**Mode:** guided

## Q5. [Release engineer] Can docs and small chores go straight to `main`?

The history shows some docs commits made directly on `main` (README, testing notes), while every story goes through a PR.

A. Yes: docs and chores may go straight to `main`; stories and fixes go through a PR
B. No: every change goes through a PR
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q6. [Release engineer] How is code work split into branches?

A. One branch and one squash-merged PR per story, as today
B. One branch and PR per unit of work inside a story (smaller PRs)
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q7. [Release engineer] Are there gates before a release other than the local `.dmg` check, green CI, the merge and the tag?

There is no staging environment, since the app is a desktop app with no server.

A. No, those are the gates
B. Yes, add a gate (describe it)
X. Other (please specify)

[Answer]: A
**Mode:** guided
