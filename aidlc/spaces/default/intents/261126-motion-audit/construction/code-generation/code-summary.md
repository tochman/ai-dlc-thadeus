# Code Summary: US-0050

Builds audit items 1-11 (`motion-audit.md`). Pipeline stage cards untouched (US-0412).

## Shared (`Lcars.jsx`, `theme.css`)

- Keyframes, Full only, transform/opacity/box-shadow only: `lcars-tab-in` (200 ms), `lcars-reveal` (shared fold; the Features story reveal uses it), `lcars-changed` (one 600 ms glow).
- `useChanged(value)`, `<TabIn>` (keyed tab content, plays only after a real switch), `<Changed>`, `stagger(n)` (capped at 12), `RoundFrame bodyClassName`.
- 150 ms filter hover on `.lcars-nb`, `.lcars-pill`, `.lcars-tile`, `.lcars-chip`; raw `.settings-dialog` fade on open; static `update-dialog-run` ring under Reduced/Off.

## Views

IntentDetail, IntentList, VelocityView, TokenDetail, AgentDialog, ProjectView, MachinesView, RefreshPanel, Speckit{Features, FeatureDetail, Progress, QuickCommands}, CostPanel, Timeline, StoryComments, PlansView, editor/FileTree, FeaturesView, App.

## Tests

- Red before each Green (theme 5, Lcars 2, tabs 5, entrance 7, folds 7, live change 4, e2e 1).
- Green: theme + Lcars 62; 27 view test files 440; `tests/e2e/motion.spec.js` 2 (p95 17.7 ms, max 21.5 ms with 25 intents and 2,000 events); `intentLayout` + `speckitLayout` e2e 20. ESLint and Prettier clean on touched files.
- Not run here: the full suite with coverage (Build and Test).

## Deviations

- Folds move and fade (transform/opacity) instead of growing in height, to keep the animated-properties rule.
- GitHub Refresh body uses the fold; its heading rises.
- Config body and Refresh panel stay mounted: a second switch within 600 ms does not replay (`ponytail:`).
- Timeline: an open event that scrolls out and back in unfolds again (virtualized; `ponytail:`).
- Spec Kit quick-command rows also rise (audit item 6); AgentDialog paging keyed by event.
- `docs/releases/0.3.1.md` still lists US-0050 as planned; not in the plan.
