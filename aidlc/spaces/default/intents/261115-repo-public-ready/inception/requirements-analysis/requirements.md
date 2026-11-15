# Requirements: US-1101, get the repository ready to be public

## Intent analysis

Open-source T.H.A.D.E.U.S. (`tochman/aidlc-dash`, MIT) without publishing anything private, and give outside users and contributors the files a public project needs. The repository is made public at the end, only on the person's explicit word. US-0413 (updates without `gh`) builds on it. Type: repository hygiene and documentation, with one small app change (licences in About). Depth: Minimal.

Sources: the story in `docs/features/epic-11-open-source.md`, the code scan (`codekb/aidlc-dash/code-quality-assessment.md`, "Public-readiness review"), and answers Q1–Q8 in `requirements-analysis-questions.md`.

## Functional requirements

**FR1 Review of what becomes public.** A short review file lists every finding with a keep, clean or remove decision.
- FR1.1 It covers the `aidlc/` records, personal paths and emails in tracked files, fixtures, screenshots, secret-like strings and AI-DLC's own files.
- FR1.2 Each item names its decision and, when cleaned, what was changed.

**FR2 AI-DLC records cleaned, kept public (Q1: B).**
- FR2.1 Machine-specific home paths, personal email addresses and private project names in tracked files under `aidlc/` are replaced or removed.
- FR2.2 Audit logs, typed prompts, cost figures and memory rules otherwise stay as they are.

**FR3 The private reference project cleaned from the files (Q3: A).**
- FR3.1 The four epic files no longer name the reference project's local path; they use a neutral wording.
- FR3.2 Fixtures copied from the reference project (K2 stories, the audit fixture) get invented content that keeps every test green.
- FR3.3 `docs/screenshots/intents.png` and `cost.png` are replaced with screenshots of a demo project; the other screenshots are checked and replaced if they show private data.
- FR3.4 The machine name in `tests/fixtures/picker/no-picker.txt` is made generic.

**FR4 Secret scan (Q4: B).**
- FR4.1 `gitleaks` scans the full history locally; every finding is resolved, and a secret that was ever committed is rotated, not only removed.
- FR4.2 A `gitleaks` step in the `verify` job of `.github/workflows/release.yml` scans pull requests and blocks on a finding.

**FR5 Public project files.**
- FR5.1 `README.md` is written for outside users: what the app is, install, build, test, contribute, and the "private" wording is gone.
- FR5.2 `CONTRIBUTING.md` describes the branch, story, TDD and pull request workflow from `team.md`.
- FR5.3 `CODE_OF_CONDUCT.md` is the Contributor Covenant 2.1 with `info@auctum.se` as the conduct contact (Q7: B).
- FR5.4 `SECURITY.md` points to GitHub's private vulnerability reporting, which is turned on for the repository (Q7: B).
- FR5.5 Issue templates (bug, feature) and a pull request template exist under `.github/`.
- FR5.6 `release.yml` and `electron-builder.yml` no longer describe the repository as private.

**FR6 Third-party licences (Q5: C).**
- FR6.1 The build generates `THIRD_PARTY_LICENSES` from what the packaged app bundles (including Monaco, the OFL-1.1 font and Electron's notices) and ships it in the app.
- FR6.2 The About window has a way to show that file.
- FR6.3 `LICENSE` and `package.json` stay MIT and agree.

**FR7 AI-DLC's own files stay public (Q6: A).** `.claude/`, `.opencode/`, `.aidlc/`, `AGENTS.md`, `aidlc.settings.json` and `opencode.json` stay tracked; the test reading `.claude/settings.json` keeps working.

**FR8 Making it public (Q8: A).**
- FR8.1 Only on the person's explicit word: `gh repo edit --visibility public --accept-visibility-change-consequences`.
- FR8.2 Afterwards, the latest release page and its download URLs work without signing in (checked with an unauthenticated request).

## Non-functional requirements

- **NFR1 Privacy:** after the change, a search of tracked files finds no `/Users/<name>` home path other than generic fixture paths, no personal email other than commit authorship, and no name of the private reference project.
- **NFR2 Safety:** no history rewrite (Q2: A, Q3: A); every commit id stays the same.
- **NFR3 Quality:** the full test suite, ESLint and Prettier stay green; new behaviour (licence generation, About entry) is written test first; every new user-facing text goes through `t()` in Swedish and English.

## Constraints

- Commit author emails stay in the history (Q2: A).
- One story pull request, squash-merged into `main` (team rule).

## Assumptions

- The audit shard file names (`audit/macbookpro-<id>.md`) keep their names: AI-DLC links them to this clone, and "macbookpro" names a model, not a person. Their contents are cleaned like the rest (FR2.1).
- `info@auctum.se` is an intended public contact.

## Out of scope

- History rewrite of any kind.
- Updates without `gh` (US-0413).

## Open questions

None.
