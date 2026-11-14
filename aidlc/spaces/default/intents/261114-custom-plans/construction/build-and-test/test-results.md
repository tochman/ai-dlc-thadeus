# Test Results: v0.2.4

Run on 2026-11-14 on `main` at `0293db3` (after PRs #23–#29), on macOS.

## Build

| Command | Exit | Result |
|---------|------|--------|
| `npx electron-vite build` | 0 | `✓ built in 2.81s`. The startup chunk `index-BOh4JW3W.js` is 2,233 kB. Monaco's chunks are separate and lazy (`editor.api` 5,050 kB, `MonacoPane` 1,124 kB, `workers` 1,076 kB). |
| `npm run build:mac` | 0 | Run in Code Generation Step 25 (`code-summary.md`). The worker files are inside `app.asar`, and `app.asar` is 46 MB. Not re-run in this stage. |

## Unit tests

Each distinct command was run once.

| Command | Files | Tests | Passed | Failed | Skipped |
|---------|-------|-------|--------|--------|---------|
| `npm test` (full suite) | 59 | 350 | 350 | 0 | 0 |
| The five stories' commands from `unit-test-instructions.md`, plus `tests/renderer/ResumeButton.test.jsx` (US-0007), in one run | 12 | 92 | 92 | 0 | 0 |

The full-suite run logs jsdom's `HTMLCanvasElement.getContext() not implemented` notice (xterm in the smoke tests). It is not a failure.

Baseline before this work was 52 files and 285 tests, all passing. The work added 7 test files and 65 tests, with no regressions (NFR1).

### By story

| Story | Test files | Tests |
|-------|-----------|-------|
| US-0006 | `picker.test.jsx`, `pickerSmoke.test.jsx` (real `@xterm/xterm` Terminal in jsdom), `QuestionPopup.test.jsx`, `tests/main/questions.test.js` | 44 |
| US-0409 | `AboutDialog.test.jsx` | 6 |
| US-0207 | `tokenFlow.test.jsx`, `TokenView.test.jsx` | 9 |
| US-0007 | `ResumeButton.test.jsx` (4 new) | 9 |
| US-0903 | `tests/main/plans.test.js`, `PlansView.test.jsx` | 13 |
| US-1001 | `tests/main/fileWrite.test.js`, `EditorPanel.test.jsx` (Monaco mocked) | 11 |

## Coverage

No coverage floor applies (ultra-express, Minimal strategy; the Testing Contract sets none). No coverage run was needed.

## Where the UI checks ran

Every renderer test ran in jsdom with Testing Library, which is integration evidence, not evidence from a real Chromium. None of these have been seen in the real Electron window yet:

- the About window's new look (US-0409);
- the token meters and waveform (US-0207);
- the Plans view (US-0903);
- the Monaco editor (US-1001), including its workers in the built `.dmg` and the 1 MB open time.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|-----------|--------|----------|--------|----------|--------------|---------|
| T-NFR1 | requirements.md NFR1 | Existing suite green before and after | 285/285 before; 350/350 after | `npm test` above | build-and-test | Met |
| T-NFR2 | requirements.md NFR2 | ≥1 test per story requirement | 6–44 tests per story | table above | build-and-test | Met |
| T-NFR3 | requirements.md NFR3 | No text or image from the reference screenshots | No match for the screenshot words in `AboutDialog.jsx`, `TokenView.jsx` or `en.json` | grep on 2026-11-14 | build-and-test | Met |
| T-NFR4 | requirements.md NFR4 | ≥4.5:1 contrast, text labels, motion follows the animations setting | Contrast ≥7.8:1 by calculation; labels and reduced motion asserted in tests | `code-summary.md`; `TokenView.test.jsx`, `AboutDialog.test.jsx` | build-and-test | Met (jsdom; the look is not yet seen in the app) |
| T-NFR5 | requirements.md NFR5 | A half-written ledger keeps the last good meters | Asserted | `TokenView.test.jsx`, `tokenFlow.test.jsx` | build-and-test | Met |
| T-NFR6 | requirements.md NFR6 | Writes refused outside the root and to engine-owned or stock files; diff before tier-2 edits | Asserted | `fileWrite.test.js`, `plans.test.js` | build-and-test | Met |
| T-FR1.1 | epic-00 US-0006 | Popup answer reaches the picker; popup closes | Asserted on fixtures from the real picker and in real xterm smoke tests | `picker*.test.jsx`, `QuestionPopup.test.jsx` | build-and-test | Met |
| T-FR1.2 | epic-04 US-0409 | New About design, US-0408 behaviour kept | Asserted in jsdom | `AboutDialog.test.jsx` | build-and-test | Met (jsdom; look not seen in the app) |
| T-FR1.3 | epic-02 US-0207 | Live token meters and waveform | Asserted in jsdom | `TokenView.test.jsx` | build-and-test | Met (jsdom; look not seen in the app) |
| T-FR1.4 | epic-09 US-0903 | Every criterion | Asserted | `plans.test.js`, `PlansView.test.jsx` | build-and-test | Met |
| T-FR1.5 | epic-10 US-1001 | Every criterion | All but Performance asserted. Performance (1 MB open < 1 s, start time unchanged, workers running in the built app) needs the real Electron window | `fileWrite.test.js`, `EditorPanel.test.jsx`; `code-summary.md` | build-and-test | Unverified (only gap: no real Chromium run; said at the gate) |
| T-FR2.1–2.3 | requirements.md FR2 | One PR per story; docs lifecycle; release plan | PRs #23–#29 merged with CI green; docs updated; `docs/releases/0.2.4.md` | GitHub, `docs/` | build-and-test | Met |
| T-FR2.4 | requirements.md FR2.4 | Version 0.2.4, tag, release workflow | Not yet; deployment stages own it | n/a | deployment-execution | N/A here (owned by a later stage) |
| T-CI | Testing Contract | CI before merge | The plan runs no CI Pipeline stage. The repo's own CI ran on every PR anyway | n/a | n/a | N/A: the plan runs no CI Pipeline |
