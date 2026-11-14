# Team-Level Rules

> This team's affirmed practices and corrections. Loaded after `org.md` as
> strict-additive guidance; contradictions with broader policy are rejected.
> Populated by the practices-discovery affirmation gate. Edit at the gate,
> not directly.

## Way of Working

We use trunk-based development with `main` as the only trunk. Each story gets one short-lived branch and one pull request, squash-merged into `main` as a single commit with its story number in the subject, for example `feat(US-1001): edit files in the app with Monaco (#29)`.

Docs and small chores may go straight to `main` without a pull request. Stories and fixes always go through their own pull request.

Small reported fixes are handled as stories in `docs/features/epic-00-fixes.md`, fixed directly on their branch, with the story marker updated as the work goes. A fix that grows into a feature moves to its topic's epic and goes through AI-DLC.

Feature docs are part of every delivery. `docs/FEATURES.md` and the epic files carry each story's status marker, and CI fails a pull request whose markers lag behind the delivered stories (`tests/main/featureDocsStatus.test.js`).

Branch names follow the kind of change: `feat/<story>`, `fix/<story>`, `docs/<topic>`, `chore/<topic>`, and `release/vX.Y.Z` for a release's version-bump pull request. Release commits read `release: vX.Y.Z (#NN)`.

## Walking Skeleton

Off. We do not build a thin end-to-end slice first. Work is built in the planned order, story by story, as the release plan sets it.

## Testing Posture

- **Methodology**: tdd
- **Methodology evidence**: Decided by the person at the practices interview (Q1: test first, TDD, for new work). Earlier Code Generation plans recorded the framework default `test-after`; the affirmed choice replaces it for new work.
- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.
- **Runner**: vitest 5.1.0 with two projects, `main` (node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale). Currently 353 `it`/`test` call sites by static count; the knowledge base's "about 490" is not reconciled.
- **Coverage floor**: 80% line coverage, checked in CI with `@vitest/coverage-v8` (Q2). Not set up yet; it is to be added to the repository and to the `verify` job of `.github/workflows/release.yml`. No coverage is measured today.
- **Suite green before merge**: the full `npx vitest run tests/` suite must pass before any story pull request merges. CI runs it on every pull request into `main` and on every version tag.
- **Manual check**: the built macOS `.dmg` is checked by hand before a release tag. Jsdom tests do not run the built app.

## Guard Policy

<!-- Affirmed by the team. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless project.md or the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

We ship a desktop app, not a hosted service. A release is a git tag `vX.Y.Z` on `main`, placed after a release pull request bumps `package.json`.

The gates, in order (Q7): the local `.dmg` check by hand; green CI on the release pull request; the merge; the tag. There is no staging environment.

The tag drives `.github/workflows/release.yml`: it checks the tag equals `package.json`, builds the macOS universal `.dmg` and the Linux `.deb`, and publishes a regular GitHub release marked "latest" (not a prerelease) with `--generate-notes`, the two packages and `SHA256SUMS.txt`.

After publishing, the smoke test is manual: all three files present, an earlier install is offered the update, and the installed app shows the new version in About.

Rollback is fix forward. A broken release is marked as a prerelease (`gh release edit vX.Y.Z --prerelease`), which stops the updater from offering it. The fix becomes an EPIC-00 story and ships as the next patch version. The tag is not deleted.

## Code Style

ESLint and Prettier run in CI, and a failure blocks the merge (Q3). They are not set up yet; they are to be added to the repository and to CI. Until then, style is kept by hand: two spaces, single quotes, semicolons, and lines up to about 160 characters.

Beyond the tooling, we follow the repository's conventions:

- Naming follows the language: camelCase for JavaScript and JSX identifiers; `data-testid` values are kebab-case, shaped `<component>-<role>`.
- Module header comments and the doc comments of exported functions name their story and requirement, for example `US-0505 FR1.4`.
- A deliberate shortcut carries a `ponytail:` comment that names its ceiling.
- Every user-facing text goes through `t()` with ICU placeholders; `tests/main/i18nKeys.test.js` requires the same keys in `sv.json` and `en.json`.
## Forbidden

<!-- Team-specific forbidden patterns -->

## Mandated

<!-- Team-specific mandates -->

## Corrections

<!-- Self-learning loop appends here. -->
