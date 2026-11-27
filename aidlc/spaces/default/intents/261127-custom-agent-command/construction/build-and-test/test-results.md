# Test Results: US-0806

Run 2026-11-27 on `feat/US-0806` (macOS). `origin/main` is ahead only by `.thadeus` token syncs and `docs/releases/0.3.2.md`, no code, so no merge was needed before this run.

## Build

`npx electron-vite build`: success, built in 2.92s.

## Tests

| Command | Exit | Result |
|---|---|---|
| `npx vitest run tests/ --coverage` | 0 | 208 files, 3,227 passed, 1 skipped, 0 failed (342.8s) |
| `npx playwright test` (built app, Electron) | 0 | 31 passed (3.8m) |
| `npm run lint` (`eslint . --max-warnings 0`) | 0 | clean |
| `npm run format:check` (`prettier --check .`) | 0 | clean |

The unit-scoped command from `unit-test-instructions.md` is part of the full-suite run above.

## Coverage (full suite, v8)

Statements 92.4%, branches 86.04%, functions 90.19%, lines 94.19%. Changed files: `harnesses.js` 100% lines, `TerminalPanel.jsx` 90.5%, `ProjectSettingsView.jsx` 94.59%, `ProjectView.jsx` 70.11% (below 80% before this story too; the floor is project-wide).

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| T-COV | team.md Testing Posture | ≥80% lines over `src/**` | 94.19% | full-suite coverage run, exit 0 | build-and-test | Met |
| T-GREEN | Testing Contract scope_floor | existing suite green | 0 failed | full-suite run | build-and-test | Met |
| T-STYLE | project.md Mandated | ESLint and Prettier clean | both exit 0 | lint, format:check | build-and-test | Met |
| T-E2E | team.md End-to-end | built-app tests pass | 31 passed | `npx playwright test` in Electron (Chromium) | build-and-test | Met |
| NFR1 | requirements.md | command validated in main, never taken from the tab | tests pass | `ipc.test.js`, `settings.test.js`, `pty.test.js` | build-and-test | Met |
| NFR2 | requirements.md | TDD and ≥80% lines | Red runs recorded; 94.19% | code-generation plan, coverage run | build-and-test | Met |
| NFR3 | requirements.md | ≤1 login-shell run per tab start | one `exec` call asserted | `ipc.test.js` | build-and-test | Met |
| T-CI | Testing Contract (CI before merge) | CI runs tests before merge | — | — | — | N/A: the plan runs no CI Pipeline (the existing `verify` job runs on the pull request) |
