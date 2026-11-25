# Test results

## Third run (2026-11-25, after loop-back 2): passed

| Check | Where | Result |
|---|---|---|
| `npx vitest run tests/ --coverage` | here, commit 7c0feac | exit 0: 189 files, 2681 passed, 1 skipped, 0 failed; 93.52% lines |
| The same | CI (Linux), pull request #132 | 2681 passed, 1 skipped, 0 failed; 93.5% lines |
| `npx playwright test` (Electron's Chromium) | here and CI | 18 passed, 0 failed |
| ESLint, Prettier, bundle | here and CI | clean |
| Secret scan | CI | passed |
| NFR3: AI-DLC's real archive and unarchive | throwaway clone, by the person | exit 0 twice; exactly the state, `intents.json` and one audit file changed |

Two earlier local runs of the same code exited 1 on one test, `TokenDetail.test.jsx` "click or Enter on the small view opens the detail". The second was over its 5 s limit; the first one's error was not kept. Alone it takes 773 ms on this branch and 738 ms on `main`, with the machine's load average near 10 when it failed, so it is taken as load and not this work. Proposed for US-0052. The one skipped test was not looked into. Unpark's switch, changed to the same form, was not run for real.

## Second run (2026-11-25, after loop-back 1): failed on NFR3

**Diagnosis:** the person's real run at 11:33 gave `error: unknown command 'intent'`. AI-DLC 2.11.3 has the commands under `aidlc engine intent`. The requirements (FR1.3, FR2.2) have the wrong form, so the code and its tests do too, and the tests could not see it because AI-DLC is mocked. The released Unpark of an intent that is not active (`intentPark.js`, US-0510) has the same fault.

**Candidate fix:** put `engine` first, in `intentArchive.js` and `intentPark.js`, with the expected arguments in their tests changed first.

| Check | Where | Result |
|---|---|---|
| `npx electron-vite build` | here | success |
| `npx vitest run tests/ --coverage` | here | exit 0, 93.52% lines |
| The same, with test counts | CI (Linux), pull request #132 | 189 files, 2681 passed, 1 skipped, 0 failed; 93.5% lines |
| `npx playwright test` (Electron's Chromium) | here and CI | 18 passed, 0 failed |
| ESLint and Prettier | here and CI | clean |
| Secret scan | CI | passed |
| AI-DLC's real archive and unarchive (NFR3) | throwaway clone, by the person | failed, see the diagnosis |

New files: 95.45% lines in `src/main/intentArchive.js`, 100% in the other four. The one skipped test was not looked into.

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

### Loop-back 2 — 2026-11-25T10:35:25Z

- **Diagnosis:** the app runs `aidlc intent …`, which AI-DLC 2.11.3 does not have; the form is `aidlc engine intent …`. Unpark's switch (US-0510) has the same fault.
- **Root-cause stage:** code-generation (the wrong form came from the requirements)
- **Planned fix:** `engine` first in the three commands; their tests first.
- **Estimated impact:** effort: a few lines; financial cost: none; risk: low once the corrected real run has passed.
- **Chosen by:** the person ("1, retry with fix").
