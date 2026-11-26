# Requirements — US-1304 Delivery metrics from AI-DLC and git

## Intent analysis

A team lead wants to see whether AI work makes delivery faster and safer: the four DORA metrics (lead time, release frequency, change failure rate, time to recover) and pull request figures, worked out from what the project already records: the feature docs, the audit, the `vX.Y.Z` tags and the pull requests. It is a brownfield enhancement to the Velocity view (US-0303), which already gives each story its start and its release date (`storyMetrics`, `src/main/parsers/velocity.js`). Standard depth.

## Functional requirements

**FR1 Lead time** [Q1]
- FR1.1 A story's lead time runs from its start (the earliest intent that names it, else its git 🚧, as `storyMetrics` gives it) to the date of the tag its "Released in vX.Y.Z" marker names.
- FR1.2 The story table in the Velocity view gets a "Lead time" column; a story with no start or no tag shows "unknown", never 0.
- FR1.3 Each release shows the median lead time of its stories; the Delivery readout shows the median over all released stories.

**FR2 Release frequency**
- FR2.1 `vX.Y.Z` tags per calendar month (local time), from `listReleaseTags`; the readout shows the average per month over the months from the first tag to now.

**FR3 Change failure rate** [Q2, Q3]
- FR3.1 A release has failed when it is marked as a prerelease on GitHub, or when an EPIC-00 story names it in a `- **Fault in:** vX.Y.Z` line.
- FR3.2 The rate is failed releases divided by all tagged releases.
- FR3.3 The fix story template in `docs/features/epic-00-fixes.md` gets the `Fault in` line. A fix story without it does not count; the view says how many fix stories have none.
- FR3.4 Prereleases come from one GitHub release list call through the person's own `gh` login (platform connection, US-1201). With no connection or another platform, that part is missing and named; the fix-story part still counts.

**FR4 Time to recover** [Q4]
- FR4.1 From the failed release's tag date to the tag of the first later release that holds a fix story naming it; when only the prerelease mark is known, to the next tag after it.
- FR4.2 Shown per failed release and as a median; a failed release with no later fix tag shows "not recovered yet".

**FR5 Pull request figures** [Q5]
- FR5.1 Merged pull requests into the default branch, the last 50 (one page): time from open to merge, and review rounds (each review that asked for changes, plus one).
- FR5.2 Shown per release (pull requests merged after the previous tag and up to its tag) and as medians.
- FR5.3 Read through the platform connection for GitHub, GitLab and Bitbucket in the common shape; with no connection the figures are missing and named.

**FR6 The Delivery section** [Q1]
- FR6.1 A "Delivery" section in the Velocity view: four readouts (median lead time, releases per month, change failure rate, median time to recover), the pull request medians, and a table per release (stories, median lead time, failed and why, time to recover, pull requests, median open to merge).
- FR6.2 Each figure names its source (feature docs, audit, git tags, GitHub releases, pull requests) and says so when a source is missing.

## Non-functional requirements

- NFR1 Nothing is written in `aidlc/`; the only doc change is the `Fault in` line in the EPIC-00 template (and in fix stories the person adds).
- NFR2 The pure calculations live in `src/main/parsers/velocity.js` style (pure functions, no I/O), each with unit tests written first (TDD).
- NFR3 Network calls only through the existing platform client (`gh`/API with the person's own login, `PLATFORM_TIMEOUT_MS`); a failing call never breaks the rest of the view.
- NFR4 Every text goes through `t()` in Swedish and English; LCARS look; status as text, never colour alone.
- NFR5 Line coverage stays at or above 80%; ESLint and Prettier pass.

## Constraints

- Only one page of pull requests and releases (50) is read; marked with a `ponytail:` comment.
- GitHub does not record when a release was marked as a prerelease, so recovery starts at the tag date.

## Assumptions

- A release is a `vX.Y.Z` tag on `main` (team.md, Deployment).
- The months in FR2.1 count from the first tag, so the early months without releases lower the average.

## Out of scope

- Back-filling `Fault in` lines into old fix stories (the person can add them by hand).
- Charts over time for the DORA metrics (US-1305 brings the side-by-side chart).
- More than one page of pull requests or releases.

## Open questions

None.
