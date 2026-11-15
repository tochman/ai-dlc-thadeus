# Code Summary: US-1101, get the repository ready to be public

All 21 plan steps done. Nothing committed; no history rewrite (NFR2).

## Files

- **Records (FR2):** 59 files under `aidlc/spaces/default/` cleaned (home path → `~`, personal email → `person@example.com`, the reference project → "a reference project"); JSON files checked to parse.
- **Docs, code, tests (FR3):** `docs/features/epic-01…04`, `src/renderer/AuctumMark.jsx`, `tests/main/notify.test.js`, `tests/renderer/AppShell.test.jsx`, `SettingsView.test.jsx`, `IntentList.test.jsx`, `tests/fixtures/picker/no-picker.txt`, `tests/fixtures/audit/machine-a.md`, fixtures `261112-epic29-small-k2-fixes` and `261110-epic02-finish` (invented note-app content, same ids and counts).
- **Screenshots (FR3.3):** `docs/screenshots/intents.png`, `timeline.png`, `cost.png`, `features.png` retaken by the new `scripts/screenshots.cjs` (`npm run screenshots`) against invented demo projects in an isolated profile; English UI. `splash.png` unchanged.
- **Licences (FR6):** new `scripts/third-party-licenses.mjs` (128 packages plus Electron), `tests/main/thirdPartyLicenses.test.js`; `package.json` build scripts, `electron-builder.yml` `extraResources`, `.gitignore`; `app:openLicenses` in `src/main/ipc.js`, `openLicenses` in `src/preload/index.js`, LICENSES block in `src/renderer/AboutDialog.jsx`, `theme.css`, `sv.json`/`en.json` (`aboutDialog.licenses`, `aboutDialog.licensesFailed`), `tests/renderer/AboutDialog.test.jsx`.
- **Public files (FR5):** new `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `.github/ISSUE_TEMPLATE/bug.yml`, `feature.yml`, `.github/pull_request_template.md`; `README.md` rewritten for outside users; `release.yml` wording, `fetch-depth: 0`, gitleaks step, `pull-requests: read`.
- **Review and status (FR1):** new `docs/public-readiness-review.md` (15 findings); US-1101 🚧 in `docs/FEATURES.md` and `epic-11-open-source.md`.

## Decisions

- Bundled-dev licence list also holds Monaco's own dependencies (`dompurify`, `marked`, `state-local`); `ponytail:` comment names the hand-kept ceiling.
- gitleaks 8.30.1 over 111 commits: no leaks, nothing to rotate, no allowlist needed. Working-tree hits only in ignored `dist/` build output.
- AI-DLC files stay tracked (FR7).

## Tests

| Run | Result | ESLint | Prettier |
|---|---|---|---|
| Baseline | 1314 passed, 6 failed | 0 errors, 24 warnings | clean |
| Final | 1318 passed, 7 failed (1325) | 0 errors, 24 warnings | clean |

Red recorded: Step 9 missing module; Step 14 2 failed (`about-dialog-licenses` not found). Green: 3/3 and 8/8.

Failures not caused by this work:
- 5 in `agentHooks.test.js` / `agentHooksInstaller.test.js`: the uncommitted local change to `.claude/settings.json` (present before this work) makes the fixture read hooks as current.
- 1 in `opencodePlugin.test.js`: fails only with `THADEUS_SESSION_DIR` set (run inside the app).
- 1 timing flake under full load (`ConfigView.test.jsx` or `agentChannelScript.test.js`); passes alone.

## Not executed here

- The gitleaks CI step runs on the pull request, not locally.
- Coverage floor: measured by Build and Test on the full suite.

## Deviations

- Locale keys under `aboutDialog.*` instead of `about.*`.
- Screenshots retaken by script, at the person's request, instead of by hand.
- Left for FR8 (person's word): turn on private vulnerability reporting, make the repo public.
