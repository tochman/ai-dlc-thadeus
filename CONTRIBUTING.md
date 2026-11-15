# Contributing to T.H.A.D.E.U.S.

Thank you for wanting to help. Issues, ideas and pull requests are all welcome. This page describes how work is organised here, so your contribution fits in and gets merged quickly.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Security problems go to [SECURITY.md](SECURITY.md), never to a public issue.

## Before you start

- **Bugs and ideas:** open an issue with the bug or feature template. For anything larger than a small fix, wait for a reply on the issue before you write code, so we agree on the shape first.
- **Setup:** Node.js in the version named in [`.nvmrc`](.nvmrc), npm and git, on macOS or Linux. Run `npm install`, then `npm run dev`. See the README's [Prerequisites](README.md#prerequisites) for the tools the app itself expects (`aidlc`, an agent CLI, `gh`).

## How work is organised

- **Stories in epics.** Every change belongs to a user story with Given/When/Then acceptance criteria in an epic file under [`docs/features/`](docs/features/), listed in [`docs/FEATURES.md`](docs/FEATURES.md). A new feature first gets its story in the epic that matches its topic. Small fixes are stories in [`docs/features/epic-00-fixes.md`](docs/features/epic-00-fixes.md).
- **Status markers.** A story moves from 📋 Planned to 🚧 In progress when work starts, and to ✅ Done when it is built and approved, in its own line, in the epic's **Status** line and in its `FEATURES.md` row. CI fails a pull request whose markers lag behind (`tests/main/featureDocsStatus.test.js`).
- **AI-DLC.** The maintainers build features with [AI-DLC](https://github.com/awslabs/aidlc-workflows), and its records live in `aidlc/`. You do not need AI-DLC to contribute; a plain pull request with tests is fine.

## Branches and pull requests

- `main` is the only long-lived branch (trunk-based development).
- One story, one short-lived branch, one pull request. Branch names follow the kind of change: `feat/<story>`, `fix/<story>`, `docs/<topic>`, `chore/<topic>`, for example `feat/US-1101`.
- Pull requests are **squash-merged** into `main` as one commit with the story number in the subject, for example `feat(US-1001): edit files in the app with Monaco (#29)`.
- Fill in the pull request template: which story, what changed, how it was tested.

## Tests first

New behaviour is written test first (TDD): a failing test, then the code that makes it pass, then a refactor with the suite green.

- The suite uses Vitest with two projects: `main` (Node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, rendered in Swedish).
- Tests run against the small sample projects in `tests/fixtures/`, never against real projects.
- Run `npm test` for everything, or `npx vitest run <file>` for one file.

## Code style

- ESLint (`npm run lint`) and Prettier (`npm run format:check`) must pass. Two spaces, single quotes, semicolons, lines up to about 160 characters.
- camelCase for JavaScript and JSX identifiers; `data-testid` values are kebab-case, shaped `<component>-<role>`.
- Module header comments and the doc comments of exported functions name their story and requirement, for example `US-0505 FR1.4`.
- A deliberate shortcut carries a `ponytail:` comment that names its limit.
- Every user-facing text goes through `t()` with ICU placeholders, with the same key in `src/shared/locales/sv.json` and `en.json` (`tests/main/i18nKeys.test.js` checks this).

## What CI checks

Every pull request into `main` runs, and each must pass before the merge:

1. A secret scan of the pull request's commits (gitleaks).
2. The full test suite with an 80% line-coverage floor (`npx vitest run tests/ --coverage`).
3. ESLint and Prettier.
4. The macOS and Linux builds, including the Linux glibc check.

## Releases

Releases are cut by the maintainers: a release pull request bumps `package.json`, and a `vX.Y.Z` tag on `main` builds and publishes the macOS `.dmg` and Linux `.deb`.

## Licence

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE) of this project.
