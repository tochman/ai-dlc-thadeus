# Code Summary: US-0215 Token history for finished intents

## Files

Created: `src/main/tokenHistory.js`, `tests/main/tokenHistory.test.js`.

Modified: `src/main/contextSize.js` (`insideDir`), `src/main/ipc.js` (`tokens:readings` takes `space`, returns `{ source, readings, wallMs, gap }`), `src/preload/index.js`, `src/renderer/tokenChart.js` (`runFigures`), `src/renderer/TokenDetail.jsx` (figures strip, source note, gap line), `src/renderer/IntentDetail.jsx` (passes `space`), `src/renderer/theme.css`, `src/shared/locales/sv.json`, `src/shared/locales/en.json`, `tests/main/tokenChart.test.js`, `tests/renderer/TokenDetail.test.jsx`, `tests/renderer/TokenDetailChartSize.test.jsx`.

## Key decisions

- Each model call counts once, by `message.id`, because Claude Code writes one call over several lines.
- Stage windows reopen on `WORKFLOW_UNPARKED`, so work after a resume is counted.
- Recorded readings always win over a rebuild (FR1.1). A rebuild is kept in memory per intent and writes nothing (FR6).
- Calls at the same millisecond merge into one point. A rebuild with more than 2000 points is thinned evenly, the same cap as stored readings (`ponytail:` comments).
- The gap line also names "calls the transcripts do not hold, such as subagents" when every session was read but the total is still lower.

## Tests

27 new tests (17 main module, 4 figures, 6 view), each Red run seen failing before Green.
- `npx vitest run tests/main/tokenHistory.test.js tests/main/contextSize.test.js tests/main/tokenChart.test.js`: 37 passed.
- `npx vitest run tests/renderer/TokenDetail.test.jsx tests/renderer/TokenDetailChartSize.test.jsx`: 31 passed.
- Also run and green: the `ipc`, `preload`, `IntentDetail`, `i18nKeys` and `theme` tests.

Written but not run here: the full suite (Build and Test runs it). Coverage is not measured because no coverage tool is set up yet.

## Real-transcript check (Step 13)

25 finished intents without readings rebuilt (45–805 points each), and every ledger session file was found. Assumption 1 holds. Nothing changed under `aidlc/` or `.thadeus/`.

| Intent | Ledger | Rebuilt |
|---|---|---|
| 261114-agent-dialogs | 692.9 M | 363.6 M |
| 261115-release-handling | 96.3 M | 18.5 M |
| 261113-linux-compat-icon | 58.9 M | 52.9 M |
| 261113-cost-and-models | 75.5 M | 118.6 M |

Rebuilt totals are mostly 40–90% of the ledger's. The likely reason is subagent calls: the rebuild finds no 5-minute cache writes. **Open for Build and Test:** 261113-cost-and-models comes out *higher* than the ledger. The likely cause is a shared session whose calls overlap this intent's stage windows. The gap line shows the difference but gives no reason for an excess.

## Deviations

- In Step 4 one test addition was written with a shell heredoc instead of the file tools. The content is unaffected.
- Two existing test expectations now include the space `'default'`.
