# Test results

## First run (2026-11-25): failed

- **Build:** `npx electron-vite build` succeeded. ESLint and Prettier: clean.
- **Suite:** `npx vitest run tests/ --coverage` wrote its coverage report (93.52% lines; new files 95.45% to 100%). Its exit code and test counts were cut off by the output filter, so it counts as not recorded and is run again after the fix.
- **Built app (Playwright, Electron's Chromium):** 14 passed, 2 failed; the 2 failed again alone.

| Failed test | Assertion |
|---|---|
| `intentLayout.spec.js` AC1 at 1280: no horizontal overflow | scroll width 765, expected at most 718 |
| `intentLayout.spec.js` AC2 at 1280: the Units graph | the same 765 and 718 |

**Diagnosis:** the detail's head actions are one row that cannot wrap (`.intent-head-actions` in `theme.css`). The new Archive pill makes the row 47 px wider than the frame at 1280 px. At 1920 px it fits. The component tests run in jsdom, which has no layout, so they could not see it.

**Candidate fix:** let the head actions wrap, with Park and Resume kept together as one piece (US-0037 FR3.1): `theme.css` and a small wrapper in `IntentDetail.jsx`. The failing built-app tests are the red tests.

- **NFR3:** AI-DLC's real archive and unarchive have not been run.

## Added at the person's request

The person reported that the "Step n of m" text lies over the frame's thin line and asked for it directly in this work. A built-app test ("US-0513 at 1920") failed first (26 points of the line inside the step's box); the step row now starts in line with the chips (`theme.css`).

## Loop-Back Log

### Loop-back 1 — 2026-11-25T10:08:47Z

- **Diagnosis:** the Archive pill makes the unwrappable head actions 47 px too wide at 1280 px.
- **Root-cause stage:** code-generation
- **Planned fix:** let the head actions wrap, with Park and Resume kept together.
- **Estimated impact:** effort: a few lines; financial cost: none; risk: low.
- **Chosen by:** the person ("Retry with fix").
