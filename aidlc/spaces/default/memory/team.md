# Team-Level Rules

> This team's affirmed practices and corrections. Loaded after `org.md` as
> strict-additive guidance; contradictions with broader policy are rejected.
> Populated by the practices-discovery affirmation gate. Edit at the gate,
> not directly.

## Way of Working

We use trunk-based development with `main` as the only trunk. Each story gets one short-lived branch and one pull request, squash-merged into `main` as a single commit with its story number in the subject. Docs and small chores may go straight to `main`. Stories and fixes always go through their own pull request.

Small reported fixes are stories in `docs/features/epic-00-fixes.md`. A fix that grows into a feature moves to its topic's epic and goes through AI-DLC. Feature docs are part of every delivery: `docs/FEATURES.md` and the epic files carry each story's status, and CI checks them (`tests/main/featureDocsStatus.test.js`, present).

Branch names follow the kind of change: `feat/<story>`, `fix/<story>`, `docs/<topic>`, `chore/<topic>`, `release/vX.Y.Z`. Release commits read `release: vX.Y.Z (#NN)`. Recent history follows these names. Two local fix branches (`fix/US-0020`, `fix/US-0034`) are still around; this does not change the practice.

Epic 14 (Spec Kit) is planned as stories US-1401 to US-1410 for v0.3.0, built in the order their dependencies set.

## Walking Skeleton

Off. We do not build a thin end-to-end slice first. Work is built in the planned order, story by story, as the release plan sets it. Epic 14 has no reason to change this: its stories already name their dependencies.

## Testing Posture

- **Methodology**: tdd
- **Methodology evidence**: Decided at the practices interview (test first for new work), carried over from the baseline. Git history cannot show test-first ordering, so this is not re-proven from evidence.
- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.
- **Runner**: vitest 5.1.0 with three projects: `main` (node, `tests/main/**`, 98 files), `scripts` (the timed hook-script tests, run after the others, retried twice), and `renderer` (jsdom, `tests/renderer/**`, 53 files, Swedish locale).
- **End-to-end**: Playwright 1.65 drives the built app through Electron (`tests/e2e`, US-0608). This is new since the baseline.
- **Test count**: about 1,630 `it`/`test` lines by a static grep (1,136 in `main`, 497 in `renderer`). The baseline's 353 was out of date. Not counted by running the suite.
- **Coverage floor**: 80% line coverage, v8, over `src/**` and the app's opencode plugin. Some agent and dialog files each hold 80% on their own. Set up in `vitest.config.mjs` and checked in CI. Current percentage not measured here.
- **Suite green before merge**: the full suite (`npx vitest run tests/ --coverage`) runs in CI on every pull request into `main` and on every version tag.
- **Manual check**: the built macOS `.dmg` is still checked by hand before a release tag. The built-app Playwright tests in CI do not replace this check.

## Guard Policy

<!-- Affirmed by the team. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless project.md or the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

We ship a desktop app, not a hosted service. A release is a git tag `vX.Y.Z` on `main`, placed after a release pull request bumps `package.json`.

The gates, in order: the local `.dmg` check by hand; green CI on the release pull request; the merge; the tag. There is no staging environment.

The tag drives `.github/workflows/release.yml`. Its `verify` job checks the tag against `package.json`, runs a gitleaks secret scan, the coverage tests, ESLint, Prettier, and the built-app end-to-end tests. Then `build-mac` (universal `.dmg`) and `build-linux` (`.deb` on Ubuntu 22.04, with a glibc check) run. The `release` job writes `SHA256SUMS.txt` and publishes a GitHub release with `--generate-notes`, not as a prerelease. Pull requests into `main` run the same build and test jobs but do not publish.

The gitleaks secret scan runs on every pull request in the `verify` job and blocks the merge when it finds a secret. False positives are recorded in `.gitleaksignore` with their fingerprint.

After publishing, the smoke test is manual: all three files present, an earlier install is offered the update, and the installed app shows the new version in About.

Rollback is fix forward. A broken release is marked as a prerelease (`gh release edit vX.Y.Z --prerelease`), which stops the updater from offering it. The fix becomes an EPIC-00 story and ships as the next patch version. The tag is not deleted.

Epic 14 ships as v0.3.0, its own minor release, as the project rule requires. The next patch after it is v0.3.1.

## Code Style

ESLint and Prettier are set up and run in CI, and a failure blocks the merge. The baseline's "not set up yet" is out of date.

- Prettier 3.10: print width 160, single quotes, semicolons, two-space indent, no trailing commas, arrow parentheses always (`.prettierrc.json`).
- ESLint 9 flat config (`eslint.config.mjs`): JavaScript recommended rules, React and React Hooks rules, and Prettier's config to switch off style rules.

Beyond the tooling, we follow the repository's conventions:

- Naming follows the language: camelCase for JavaScript and JSX identifiers; `data-testid` values are kebab-case, shaped `<component>-<role>`.
- Module header comments and the doc comments of exported functions name their story and requirement, for example `US-0505 FR1.4`.
- A deliberate shortcut carries a `ponytail:` comment that names its ceiling. The code has many of them.
- Every user-facing text goes through `t()` with ICU placeholders; `tests/main/i18nKeys.test.js` requires the same keys in `sv.json` and `en.json`.
## Forbidden

<!-- Team-specific forbidden patterns -->

## Mandated

<!-- Team-specific mandates -->

## Corrections

<!-- Self-learning loop appends here. -->
