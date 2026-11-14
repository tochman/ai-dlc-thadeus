# Requirements Analysis Questions: v0.2.3 release

Context: the plan in `docs/releases/0.2.3.md` takes four stories. US-0405 (settings view) is done. US-0902 (project defaults) is built on `wip/us-0902-project-defaults`, but its feature docs are not updated yet. US-0904 (models and effort per agent) and US-0407 (update the app from a GitHub release) have not been started. `package.json` is still at 0.2.2.

## Q1. [Product] What should this piece of work cover?

Determines whether Code Generation builds stories or only does release work.

A. Build US-0904 and US-0407 here, then release v0.2.3 with all four stories
B. Release only: US-0904 and US-0407 get their own workflows first, and this work just wraps up docs, version and tag after them
C. Release now with US-0405 and US-0902, and move US-0904 and US-0407 to v0.2.4
X. Other (please specify)

[Answer]: A

## Q2. [Product] Should the stretch story US-0803 (Claude Code and opencode side by side) be in v0.2.3?

The plan says "if there is room". It sets up v0.2.4's headline.

A. No, keep it for v0.2.4
B. Yes, include it
X. Other (please specify)

[Answer]: B

## Q3. [Quality] Should Build and Test close the two open criteria the plan assigns to v0.2.3?

These are US-0301 (20 000-event render timing in the real Electron renderer) and US-0401 (verified on an installed release on macOS and Linux).

A. Yes, close both
B. Close only US-0301 (no Linux machine at hand)
C. Leave both open and note them in the release
X. Other (please specify)

[Answer]: A

## Q4. [Release] How should the release reach `main`?

v0.2.2 used a `release/v0.2.2` branch and a PR.

A. Same as v0.2.2: `release/v0.2.3` branch, PR to `main`, tag after merge
B. Merge the story branches to `main` and tag `v0.2.3` there
X. Other (please specify)

[Answer]: A
