# Requirements Analysis Questions (US-0608)

The story's acceptance criteria in `docs/features/epic-06-feature-docs.md` settle most of the work. These four questions cover what the criteria leave open.

## Q1. [Product owner] What counts as "the story's own" planning change on a story branch?

The criteria say a change to the story's own markers and criteria stays with the story, and every other planning change goes to the app's branch. The app has to decide this from what it can see.

A. The story id in the branch name (`feat/US-0608` → US-0608): only that story's block in its epic file and its row in `FEATURES.md` stay; everything else goes to the app's branch
B. As A, plus every story the active intent's description names
C. As A, but a brand-new story written on the branch also stays when it is the branch's story
X. Other (please specify)

[Answer]: B

## Q2. [Product owner] How long is the "short window" whose changes go out as one commit?

Today the app pushes when idle right after an action, or on the push interval (US-0607).

A. Everything waiting when the next push starts goes out as one commit (no separate timer)
B. 30 seconds after the last change, then commit and push
C. 2 minutes after the last change, then commit and push
X. Other (please specify)

[Answer]: B

## Q3. [Developer] Where do the end-to-end tests of the built app run in CI?

The `verify` job runs on Linux with no display today; Electron needs one.

A. In `verify` on Linux, under `xvfb-run`, against the unpackaged build
B. In a separate macOS job, against the built `.dmg` app
C. Both A and B
X. Other (please specify)

[Answer]: C

## Q4. [Product owner] On a conflict (a file changed both in the record and on the target), how are "both versions" kept?

The criteria say name the file and keep both versions, overwriting neither.

A. The target's version stays in the file; the app's version stays in the record, and the release list shows the file with "Use mine", "Keep theirs" and "Open both in the editor"
B. As A, but without choices: the release list only names the file, and the person merges by hand in the editor
C. Write the app's version next to the file as `<name>.mine.md` and name both files
X. Other (please specify)

[Answer]: A
