# Requirements: v0.2.3 release

## Intent Analysis

Finish and ship T.H.A.D.E.U.S. v0.2.3, themed "Make the console actionable — and keep itself current" (`docs/releases/0.2.3.md`). The release has five stories. US-0405 is done. US-0902 is built on `wip/us-0902-project-defaults`, but its docs are not updated. This work builds US-0904, US-0407 and the stretch story US-0803 [Q1, Q2], closes two open criteria from earlier releases [Q3], and releases through a `release/v0.2.3` branch and PR [Q4].

Each story's full acceptance criteria live in its epic file. The requirements below point to them; they do not restate them. A story requirement passes when every acceptance criterion in its epic section is ticked `- [x]` and verified in Build and Test.

## Functional Requirements

### FR1 Stories in the release

| ID | Requirement | Pass criterion | Source |
|----|-------------|----------------|--------|
| FR1.1 | US-0405 (settings view with native file pickers) ships unchanged. | Already done (commit `37a28fb`); its existing tests stay green. | `docs/releases/0.2.3.md` |
| FR1.2 | US-0902 (change project defaults and the active work's settings) is built. The earlier intent `261114-project-defaults` produced documents only, no code. | Every acceptance criterion in `epic-09-aidlc-configuration.md` § US-0902 passes. | `docs/releases/0.2.3.md`; Code Generation finding, person chose "Build all four" |
| FR1.3 | US-0904 (choose models and effort per agent) is built. | Every acceptance criterion in `epic-09-aidlc-configuration.md` § US-0904 passes, with Claude Code and opencode rule tables and read-only display for other harnesses. | [Q1] |
| FR1.4 | US-0407 (update the app from a GitHub release) is built. | Every acceptance criterion in `epic-04-branding-and-desktop.md` § US-0407 passes: check, offer, download with checksum, install and restart on macOS and Linux, busy-tab prompt, cleanup setting, repository check. | [Q1] |
| FR1.5 | US-0803 (Claude Code and opencode side by side) is built. | Every acceptance criterion in `epic-08-harnesses.md` § US-0803 passes. | [Q2] |
| FR1.6 | US-0408 ("Om T.H.A.D.E.U.S." window with logo, name, tagline and app version) is built. | Every acceptance criterion in `epic-04-branding-and-desktop.md` § US-0408 passes. | Added by the person during Build and Test, "Yes, in v0.2.3" |

### FR2 Open criteria from released stories

| ID | Requirement | Pass criterion | Source |
|----|-------------|----------------|--------|
| FR2.1 | Close US-0301's open item: 20 000-event render timing in the real Electron renderer. | A measured timing is recorded in Build and Test and the criterion is ticked in its epic file. | [Q3]; `docs/releases/0.2.3.md` |
| FR2.2 | Close US-0401's open item: verified on an installed release on macOS and on Linux. | An installed v0.2.3 build is checked on both platforms and the criterion is ticked. | [Q3]; `docs/releases/0.2.3.md` |

### FR3 Release

| ID | Requirement | Pass criterion | Source |
|----|-------------|----------------|--------|
| FR3.1 | Feature docs are current for every story in the release: story status marker, ticked criteria, the epic's `**Status (…)**` line and its `docs/FEATURES.md` row. | No shipped story is shown as planned or in progress. | `project.md` Mandated rule; release checklist |
| FR3.2 | Each shipped story is marked "Released in v0.2.3" when the tag is cut. | All five stories carry the marker. | release checklist |
| FR3.3 | `package.json` version is `0.2.3`. | `npm pkg get version` prints `"0.2.3"`. | release checklist |
| FR3.4 | The release goes through a `release/v0.2.3` branch and a PR to `main`; `v0.2.3` is tagged after the merge. | PR merged, tag `v0.2.3` on `main`, release workflow green with the macOS `.dmg` and Linux `.deb`. | [Q4] |
| FR3.5 | `docs/releases/0.2.3.md` reflects what shipped, with US-0803 moved from stretch into the release and its checklist ticked. | Plan and checklist match the shipped set. | [Q2] |

## Non-Functional Requirements

| ID | Requirement | Pass criterion |
|----|-------------|----------------|
| NFR1 | No regression. | The existing test suite passes before and after the changes. |
| NFR2 | Every new requirement has a test. | At least one unit test per story requirement (FR1.3–FR1.5), covering its main path (Minimal test strategy). |
| NFR3 | The updater downloads only from `github.com/tochman/aidlc-dash` release assets and runs nothing but the platform installer step. | A test rejects a release asset URL from another host or repository. |
| NFR4 | Settings changes (US-0902, US-0904) run CLI commands with fixed arguments and no shell. | No `shell: true` or string-built command in the new code paths. |
| NFR5 | The update check never blocks the app. | With no network, the app starts and shows one sentence about the failed check. |

## Constraints

- Ultra-express plan: Code Generation, Build and Test, Deployment Pipeline and Deployment Execution follow this stage.
- The macOS build stays unsigned, so US-0407 cannot use `electron-updater`'s Squirrel.Mac flow (epic-04 background).
- The app never edits AI-DLC's agent files; `aidlc` regenerates them (US-0904).
- Not in v0.2.3: US-0506, US-0903, US-0504, US-1001, US-0702.

## Assumptions

- [assumption] US-0904's opencode rows (`opencode models` output, `xhigh`/`max` handling, `provider/model` ids) are confirmed on a machine with opencode installed before that part is built, as epic-09 requires. Owner: the person.
- [assumption] A Linux machine or VM is available to check FR2.2 and US-0407's `.deb` install. Owner: the person.
- US-0407 reaches releases through the `gh` CLI with the person's own login (`gh release view` / `gh release download`), because `tochman/aidlc-dash` is private and the anonymous GitHub API cannot see it. This replaces the story's "with no token" API check. (Code Generation finding; person chose "Use the gh CLI".)
- US-0407 downloads the assets the release workflow actually builds: the universal macOS `.dmg` and the Linux x64 `.deb`.

## Out of Scope

- US-0506 (needs US-0803 released first) — v0.2.4.
- US-0903 custom plans, US-0504 framework updates — v0.2.4.
- US-1001 Monaco editing, US-0702 own translation files — later.
- Signing the macOS app.
- US-0203 CSV export and US-0402 transition polish.

## Open Questions

- Five Medium stories is the largest slice so far. If Code Generation shows that is too much for one release, US-0803 is the first to move to v0.2.4.
