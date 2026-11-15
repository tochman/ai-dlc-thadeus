# Requirements Analysis Questions: US-0605, create a release by hand in the release list

Today a release exists only when a story says "for vX.Y.Z" or a git tag exists; nothing stores a release that has no stories yet. `docs/releases/` already holds hand-written release plans (`0.2.3.md`, `0.2.4.md`). These questions settle what the story leaves open.

## Question 1
Where should a release that has no stories yet be kept?

A. One file per release in the existing `docs/releases/` folder: "New release" creates `docs/releases/X.Y.Z.md` with a short heading, and every plan file there (the existing ones too) counts as a planned release
B. One line per release in a new `docs/RELEASES.md` beside `FEATURES.md`, as the story suggests; `docs/releases/` stays as it is
C. In the app's own project settings: not committed, so other clones and tools do not see it
X. Other (please specify)

[Answer]: A

## Question 2
How should stories be added to a release from the release list?

A. Several at once: a list of the stories not yet in a release, with checkboxes and one Add button
B. One at a time: pick a story, it gets its marker, then pick the next
X. Other (please specify)

[Answer]: B

## Question 3
A planned release with no stories and no tag can be deleted. What should happen to what was written in its file (with Q1 A or B)?

A. Delete it too, after a confirmation that says the text goes with it
B. Delete only an empty release; one whose file has text beyond its heading cannot be deleted from the app
X. Other (please specify)

[Answer]: B
