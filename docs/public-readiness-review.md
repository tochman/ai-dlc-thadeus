# Public-readiness review (US-1101)

What becomes public when `tochman/aidlc-dash` is made public, and what was decided for each finding (FR1). Reviewed on branch `feat/US-1101`, 2026-11-15. No history was rewritten (NFR2): commit ids stay the same.

| # | Finding | Where | Decision | What changed |
|---|---|---|---|---|
| 1 | AI-DLC records with machine-specific home paths | about 59 tracked files under `aidlc/` (audit shards, state files, `project-description.json`, stage documents, `codekb/`) | Clean, keep public (FR2) | `/Users/<name>` replaced with `~`; the Claude projects folder name with `-Users-me-`. Audit logs, prompts, cost figures and memory rules otherwise unchanged (FR2.2). Audit shard file names kept. |
| 2 | Personal email addresses in tracked files | one stage document under `aidlc/` | Clean | Replaced with `person@example.com`. |
| 3 | Personal author emails in commit metadata | `git log` (three addresses) | Keep | Part of the history; changing them needs a history rewrite, which is out of scope (Q2). |
| 4 | Name and path of a private reference project | `aidlc/` records, `docs/features/epic-01…04`, `src/renderer/AuctumMark.jsx`, `tests/main/notify.test.js`, `tests/renderer/AppShell.test.jsx`, `tests/renderer/SettingsView.test.jsx` | Clean (FR3.1) | Records and epics say "a reference project"; the tests use `demo-app`; the logo comment names the Auctum logo SVG. |
| 5 | Fixtures copied from the reference project (accounting story texts) | `tests/fixtures/project/…/261112-epic29-small-k2-fixes/`, `261110-epic02-finish/`, `tests/fixtures/audit/machine-a.md`, `tests/renderer/IntentList.test.jsx` | Clean (FR3.2) | Invented note-app texts with the same ids, counts and structure; directory names and story ids kept because tests assert them. |
| 6 | Machine name in a fixture | `tests/fixtures/picker/no-picker.txt` | Clean (FR3.4) | `audit/machine.md`. |
| 7 | Generic home paths | `tests/fixtures/agent-events/` and tests (`/Users/dev`, `/Users/me`, `/Users/x`) | Keep | Invented, not a real account. |
| 8 | Screenshots showing the private project's tab | `docs/screenshots/intents.png`, `cost.png`, `features.png`, `timeline.png` | Replace (FR3.3) | Retaken by script: `npm run screenshots` (`scripts/screenshots.cjs`) builds the app and drives it against two invented projects (`demo-app`, `demo-api`, generated in `tests/.tmp/screenshots`) with an isolated profile, English UI and a stub terminal shell. All four now show only invented names, branch and costs. `splash.png` was clean and is unchanged. |
| 9 | Secret-like strings | full history (`gitleaks git --log-opts="--all"`, gitleaks 8.30.1, 111 commits) | Resolved | No leaks found; no allowlist needed. A scan of the working tree found 5 `generic-api-key` hits, all in the ignored build output `dist/…/app.asar` (minified dependencies), never committed. |
| 10 | Secret scan in CI | `.github/workflows/release.yml` `verify` | Added (FR4.2) | Full-depth checkout and `gitleaks/gitleaks-action@v2`; a finding fails the job. False positives go in `.gitleaksignore` by fingerprint. |
| 11 | "Private" wording | `release.yml` header, `electron-builder.yml` signing comment | Clean (FR5.6) | Reworded. |
| 12 | Public project files missing | repository root, `.github/` | Added (FR5) | `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1, `info@auctum.se`), `SECURITY.md` (private vulnerability reporting), issue templates, pull request template; README prerequisites, contributing and security sections. |
| 13 | Third-party licences not listed | build | Added (FR6) | `scripts/third-party-licenses.mjs` writes `build/THIRD_PARTY_LICENSES.txt` in every build; the app ships it and opens it from About → Licenses. `LICENSE` and `package.json` stay MIT. |
| 14 | Company email | `package.json`, `electron-builder.yml`, `CODE_OF_CONDUCT.md` (`info@auctum.se`) | Keep | Intended public contact. |
| 15 | AI-DLC's own files | `.claude/`, `.opencode/`, `.aidlc/`, `AGENTS.md`, `aidlc.settings.json`, `opencode.json` | Keep (FR7) | Nothing removed; `.claude/settings.json` stays tracked for the agent-hooks fixture test. |

## Before the switch to public (FR8)

1. Turn on private vulnerability reporting in the repository settings (`SECURITY.md` points to it).
2. Run the privacy search once more on the merged `main`: `git grep -I -E '/Users/<name>|<private project name>'` and a grep for the personal emails.
3. Only then, on the owner's word: `gh repo edit --visibility public --accept-visibility-change-consequences`.
