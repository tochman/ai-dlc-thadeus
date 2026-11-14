# Requirements: v0.2.4 release

## Intent Analysis

Plan, build and ship T.H.A.D.E.U.S. v0.2.4 [Q1]. The person chose five pieces of work in chat [Q1, Q5, Q6, Q7]:

- the popup answers that still don't reach the agent (US-0004 does not work),
- a new design for the About window (US-0408),
- a new live token view,
- custom plans (US-0903),
- Monaco editing (US-1001).

Each story ships in its own PR to `main` as soon as it is built. The release (version bump, release notes, tag `v0.2.4`) comes at the end of the work [Q4]. The plan is written to `docs/releases/0.2.4.md` in the same shape as `docs/releases/0.2.3.md` [Q4].

Each story's full acceptance criteria live in its epic file. The requirements below point to them and add only what the chat decided. A story requirement passes when every acceptance criterion in its epic section is ticked `- [x]` and verified in Build and Test.

## Functional Requirements

### FR1 Stories in the release

| ID | Requirement | Pass criterion | Source |
|----|-------------|----------------|--------|
| FR1.1 | Popup answers reach the agent. The person reports "We can not update AIDLC answers or Claude answers" after US-0004 shipped in v0.2.3. The cause is found first, in the real Claude Code picker. US-0004's notes say the picker layout in the tests was written by hand and the check against the real picker was never done. Then it is fixed. Tracked as a new EPIC-00 story, US-0006, that refers back to US-0004. | Given a waiting AI-DLC question (`DECISION_RECORDED`) and the same question in Claude Code's picker, an answer picked in the popup reaches the picker, AI-DLC records `QUESTION_ANSWERED`, and the popup closes. A test reproduces the failing case with the picker text captured from a real Claude Code session. | [Q1] message 8984314c |
| FR1.2 | The About window gets the person's new design (US-0409, a follow-up to US-0408). The frame follows the reference screenshot `Screenshot 2026-11-14 at 08.57.52.png`: a rounded LCARS elbow around the content, light horizontal bars with a coloured end tab, small code labels in the frame, an EXIT block on the left edge, a title in the accent colour top right, and a small status row at the bottom. The content stays as in US-0408: Auctum mark, `APP_NAME`, `APP_FULL_NAME`, `APP_TAGLINE` and the app version. | Every acceptance criterion in `epic-04-branding-and-desktop.md` § US-0409 passes. US-0408's behaviour (menu item, Esc, Stäng/EXIT, click outside, focus return, sv/en) is unchanged. | [Q1] message 8984314c |
| FR1.3 | A live token view for the running work (new story US-0207 in EPIC-02). It shows input, output and cache tokens as glowing bar meters with a level scale, and the token rate over time as a waveform. The style follows the reference screenshot `Screenshot 2026-11-14 at 08.57.27.png`. The figures come from `usage-ledger.json` (`tokens.input`, `output`, `cacheCreate5m`, `cacheCreate1h`, `cacheRead` of the intent's `workflows` node). The rate comes from the change between ledger updates. | Every acceptance criterion in `epic-02-cost-and-models.md` § US-0207 passes. | [Q7] |
| FR1.4 | Custom plans (US-0903) are built as written, all of it, tier-2 edit and delete included [Q3]. The plans list lives in its own view, reached from the left arm like Features and Cost [Q2]. | Every acceptance criterion in `epic-09-aidlc-configuration.md` § US-0903 passes. | [Q2, Q3] |
| FR1.5 | Monaco editing (US-1001) is built as written. | Every acceptance criterion in `epic-10-editing.md` § US-1001 passes. | [Q6] |

### FR2 Delivery

| ID | Requirement | Pass criterion | Source |
|----|-------------|----------------|--------|
| FR2.1 | Each story is committed on its own branch and merged through its own PR to `main` once CI is green, before the next story's PR. | One merged PR per story in FR1. | [Q4] |
| FR2.2 | The feature docs follow each story's lifecycle: 🚧 when its work starts, ✅ when it is built and approved, "for v0.2.4" once it is in the plan, and "Released in v0.2.4" when the tag is cut. Each PR carries its own story's doc updates: the story marker, ticked criteria, the epic's `**Status (…)**` line and the `docs/FEATURES.md` row. | No story is shown as planned or in progress after it shipped. | `project.md` Mandated rules |
| FR2.3 | `docs/releases/0.2.4.md` holds the release plan: the stories, the build order, what is left out, and a release checklist, as in `0.2.3.md`. | The file exists before the first story's PR and matches what shipped at the end. | [Q4] |
| FR2.4 | The release comes at the end. `package.json` version is `0.2.4`, a release PR is merged, `v0.2.4` is tagged on `main`, and the release workflow builds the macOS `.dmg` and the Linux `.deb`. | Tag `v0.2.4` exists and the release workflow is green. | [Q4] |

## Non-Functional Requirements

| ID | Requirement | Pass criterion |
|----|-------------|----------------|
| NFR1 | No regression. | The existing test suite passes before and after each story's PR. |
| NFR2 | Every new requirement has a test (Minimal test strategy). | At least one unit test per story in FR1, covering its main path. |
| NFR3 | No Star Trek trademarks, logos, sounds or copied assets (FR9.5 of the base console). The screenshots guide layout, shape and colour only. | No text or image from the screenshots appears in the app. Labels are the app's own and are translated. |
| NFR4 | Readable status and contrast stay as they are (FR9.3, NFR3 of the base console): body text at least 4.5:1, and no status shown by colour alone. Motion follows the animations setting. | The new views pass the existing contrast and reduced-motion tests' rules. |
| NFR5 | The live token view never blocks the app or shows a wrong figure. A missing or half-written ledger keeps the last good values, and token figures are the ledger's own. | A test with a half-written ledger keeps the last good meters. |
| NFR6 | File writes outside the app's own settings follow the three tiers (aidlc CLI first, few direct edits, never engine-owned files). US-0903's tier-2 edits show the diff before writing. US-1001's saves stay inside the opened project root. | Tests reject a write outside the project root and an edit of a stock plan. |

## Constraints

- Ultra-express plan: Code Generation, Build and Test, Deployment Pipeline and Deployment Execution follow this stage.
- US-1001 is High complexity and breaks the read-only rule for the first time. The release plan for v0.2.3 kept it for "its own release, with the save/conflict handling". It is now in v0.2.4 at the person's request, so its save and conflict criteria are not cut.
- Every visible text comes from `src/shared/locales/{sv,en}.json`.

## Assumptions

- [assumption] Build order: US-0006 (the popup fix) first, because it hurts every day. Then US-0409 and US-0207, which are small and visual. Then US-0903, and US-1001 last, because it is the largest. The person can reorder at Code Generation.
- [assumption] US-0004's failure is reproduced on this machine with Claude Code. Its picker text is captured from a real session for the test.
- [assumption] The live token view lives beside the running intent's cost (the cost view and the live indicator), not as a separate arm view. Its exact place is settled in Code Generation's plan.
- [assumption] US-0408's released content stays. US-0409 changes only its look.

## Out of Scope

- US-0205 (named by mistake) [Q5].
- US-0506, US-0504 and US-0702, which `0.2.3.md` listed for v0.2.4 or later. The person did not name them for this release.
- Signing the macOS app.
- US-0203 CSV export and US-0402 transition polish.

## Open Questions

- Five stories, one of them High complexity (US-1001), is a large slice. If Code Generation shows it is too much for one release, US-1001 is the first to move.
