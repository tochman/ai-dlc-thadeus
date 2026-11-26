# Requirements Analysis Questions — US-1304 Delivery metrics

What the code has today: the Velocity view (US-0303) already gives each story its start (the earliest intent that names it, else the git 🚧) and its release date (the `vX.Y.Z` tag its "Released in" marker names), from `storyMetrics` in `src/main/parsers/velocity.js`. The tags come from one local `git tag` (`listReleaseTags`). The platform connection (US-1201) reads only open pull requests today, and the updater (US-0413) reads a release's `prerelease` flag from GitHub. 20 `v*` tags exist; no EPIC-00 story says in a fixed form which release it fixes.

## Q1. [Team lead] Where do the four metrics appear?

A. A new "Delivery" section in the Velocity view: four readouts (median lead time, releases per month, change failure rate, median time to recover), a table per release (stories, median lead time, failed or not, time to recover), and lead time added as a column in the story table
B. A new project view "Delivery" with its own arm block
X. Other (please specify)

[Answer]: A

## Q2. [Team lead] How does an EPIC-00 fix story say which release shipped the fault?

A. A new line in the fix story, `- **Fault in:** vX.Y.Z`; the app reads it, and the template for new fix stories gets it. Old fix stories without it do not count, and the view says how many fix stories have no such line
B. The first `vX.Y.Z` named in the fix story's Background
C. Any fix story released in the next patch counts against the release before it
X. Other (please specify)

[Answer]: A

## Q3. [Team lead] Where does "marked as a prerelease" come from?

A. GitHub releases through the person's own `gh` login (one list call, the platform connection); with no connection, the prerelease part is missing and the view says so, while the fix-story part still counts
B. Only fix stories (Q2); prereleases are left out
X. Other (please specify)

[Answer]: A

## Q4. [Team lead] When does time to recover start?

GitHub does not say when a release was marked as a prerelease.

A. At the broken release's tag date, ending at the tag of the next release that holds the fix story (or the next patch tag when only the prerelease mark is known)
B. At the date the fix story was added to EPIC-00 (from git), ending at its release's tag
X. Other (please specify)

[Answer]: A

## Q5. [Team lead] Which pull requests count for "open to merge" and "review rounds"?

A. Merged pull requests into the default branch, the last 50 (one page); a review round is each review that asked for changes, plus one; shown per release (by merge date before its tag) and as a median
B. As A, but every merged pull request (all pages)
X. Other (please specify)

[Answer]: A
