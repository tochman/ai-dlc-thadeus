# Test Results: US-0414

Run on 2026-11-16 on `feat/US-0414` (working tree).

- **Build:** `npx electron-vite build`, exit 0.
- **Scoped tests:** the unit-test instructions command gave 10 files and 76 tests, all passed. The placement and guard tests ran under their real `.test.jsx` names (see `code-summary.md`).
- **Full suite:** `npx vitest run tests/ --coverage` gave 118 files and 1459 tests, all passed, exit 0. Nothing failed or was skipped.
- **Coverage:** 90.96% of lines, against the 80% floor (`coverage/coverage-summary.json`). Branches 82.46%, functions 85.22%. `Tooltip.jsx` is at 100% of lines.
- **ESLint:** `npx eslint .` gave 0 errors and 24 older `react-hooks/exhaustive-deps` warnings.
- **Prettier:** `npx prettier --check . '!.thadeus/tokens/**'` passes: "All matched files use Prettier code style!". The excluded files are this machine's untracked token readings, which a CI checkout does not have.
- **Requirement coverage:** `aidlc engine sensor-traceability --stage build-and-test` passes, with no ID uncovered.

## Where the tooltip checks ran

All tooltip behaviour was checked in jsdom (a DOM emulator), not in a real browser engine: opening on focus and hover, closing on Esc, the ARIA wiring, and placement as a pure function with stubbed measurements. Three things were not checked: placement in the real window, the hover feel, and stacking against dialogs. They are left to the hand check of the built `.dmg`.
