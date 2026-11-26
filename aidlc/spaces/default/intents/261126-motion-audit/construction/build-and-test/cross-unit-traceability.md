# Cross-Unit Traceability: US-0050

**Verdict: pass.** No requirement IDs to trace (quick-fix plan, no Requirements Analysis); nothing uncovered. The story's criteria map to tests:

| Criterion | Test | Ran in |
|---|---|---|
| Audit approved first | `motion-audit.md`, approved 2026-11-26 | — |
| Marked views join the entrance | IntentList, MachinesView, RefreshPanel, Speckit* tests | jsdom |
| Tab change 150-250 ms | view tests; `motion.spec.js` (a) | jsdom; real Chromium |
| Live change once, nothing else moves | IntentList, AppShell, SpeckitFeatures, FeaturesView tests | jsdom |
| No replay on unchanged update | `Lcars.test.jsx` (`useChanged`), view tests | jsdom |
| Shared keyframes in `theme.css` | `theme.test.js` | Node |
| Reduced/Off, allowed properties | `theme.test.js`, `motion.spec.js` (a) | Node; real Chromium |
| 60 fps, 25 intents, 2,000 events | `motion.spec.js` (b) | real Chromium |
| Each added animation red first; suite green | Red runs in `code-summary.md`; full suite 3,040 passed | — |
