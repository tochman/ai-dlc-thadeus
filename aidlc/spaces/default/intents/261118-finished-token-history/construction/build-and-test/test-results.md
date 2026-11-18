# Test Results: US-0215

Run 1, 2026-11-18, branch `feat/US-0215`.

| Check | Command | Exit | Result |
|---|---|---|---|
| Bundle | `npx electron-vite build` | 0 | main, preload and renderer built |
| Story tests (main) | `npx vitest run tests/main/tokenHistory.test.js tests/main/contextSize.test.js tests/main/tokenChart.test.js` | 0 | 37/37 (Code Generation run) |
| Story tests (view) | `npx vitest run tests/renderer/TokenDetail.test.jsx tests/renderer/TokenDetailChartSize.test.jsx` | 0 | 31/31 (Code Generation run) |
| Full suite + coverage | `npm run coverage` | 0 | 149 files, 1913/1913 pass, 0 skipped; lines 92.27% (statements 90.14%, branches 83.11%, functions 87.09%) |
| ESLint | `npm run lint` | 0 | 0 errors, 29 warnings, all in files this story did not touch |
| Prettier | `npm run format:check` | 1, then 0 | `src/main/ipc.js` and two test files were unformatted; fixed in-stage with `npx prettier --write` (whitespace only), then clean |

New files: `tokenHistory.js` 97.33% lines, `tokenChart.js` 100%, `TokenDetail.jsx` 95.91%.

The full suite ran before the Prettier fix. That fix changes whitespace only.

## Finding: FR5 gives no reason when the rebuilt total is higher

The ledger's totals for `261113-cost-and-models` are 75.5 M; the rebuilt total is 118.6 M (Code Generation Step 13). `GapLine` in `src/renderer/TokenDetail.jsx` lists only reasons that explain a lower total: missing sessions, tokens outside the stage windows, and "calls the transcripts do not hold". For a higher total it shows at most the "outside the windows" reason, which explains nothing. FR5 asks the view to say why the totals differ, so FR5 is Not Met for this case.

Likely cause (not proven): a transcript session shared with another intent that ran at the same time. Calls from that other work fall inside this intent's stage windows and are counted here too. The requirements note that 22 of the ledger's 84 sessions belong to more than one intent.

**Decision (2026-11-18):** the person approved Build and Test with this gap open (accepted failure, no loop-back). The candidate fix (leave out calls inside other intents' stage windows for shared sessions, and add an overlap reason) is not built.
