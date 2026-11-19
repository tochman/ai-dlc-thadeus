# Deployment Execution — Questions

## Q1: Hand checks and the `.dmg` check (FR3, FR4)

The `.dmg` from release PR #80's `build-mac` artifact is at `dist/v0.2.10-check/THADEUS-0.2.10-universal.dmg` (git-ignored). Install it, open the app, and check:

1. About shows 0.2.10 (FR4).
2. US-0028: a new intent's pipeline view shows no missing-`runtime-graph.json` warning.
3. US-0029: moving a story to another release takes its row out of the old release plan.
4. US-0215: a finished intent shows its token history (or the "no time history on this machine" sentence) and the figures strip.
5. US-0030: Agent progress shows "waiting for <agent>" only while a permission is open, plus the agent's task and "seen N ago".
6. US-0608: a planning change waits visibly until it is on `main`, and is kept across a restart.
7. US-0031: the dialog opens on a new compact / fresh-session page, not on an old answered message.

A. All pass: merge #80, tag `v0.2.10`, publish
B. Something fails: name it; it becomes an EPIC-00 fix in this release, before the tag
C. Skip the hand checks this time: merge, tag and publish now, and check by hand after the release
X. Other (please specify)

[Answer]: A
