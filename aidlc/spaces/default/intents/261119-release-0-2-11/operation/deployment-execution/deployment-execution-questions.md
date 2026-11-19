# Deployment Execution — Questions

## Q1: Hand checks and the `.dmg` check (FR3, FR4)

The `.dmg` from release PR #83's `build-mac` artifact is at `dist/v0.2.11-check/THADEUS-0.2.11-universal.dmg` (git-ignored). Install it, open the app, and check:

1. About shows 0.2.11 (FR4).
2. US-0032 (FR3.1): in Configuration › Cost Rules of a project that already has the THADEUS rule pack, the new line "On `main`, NEVER commit `docs/FEATURES.md`, `docs/features/` or `docs/releases/`; THADEUS commits and pushes them." is offered, added with the button, and saved only through the preview.
3. US-0032 AC3 (FR3.1): an agent on `main` that changes a feature doc leaves exactly one commit, the app's.
4. US-0033 (FR3.2): after a change to one story's text on `main`, the app's commit subject names that story only (for example `docs: update US-0033`); a change to more than five stories ends with "and N more".

A. All pass: merge #83, tag `v0.2.11`, publish
B. Something fails: name it; it becomes an EPIC-00 fix in this release, before the tag
C. Skip the hand checks this time: merge, tag and publish now, and check by hand after the release
X. Other (please specify)

[Answer]: A
