# Code Quality Assessment

## Tests

- **Runner**: vitest 5.1.0 with three projects. `main` runs in node (`tests/main/**/*.test.js`). `scripts` runs the timed hook-script tests in node after the others, with up to 2 retries. `renderer` runs in jsdom with Swedish i18n (`tests/renderer/**/*.test.jsx`).
- **Size**: 72 main and 39 renderer files, 3 helpers and 95 fixtures at `721e051`. There are 1071 `it`/`test` call sites by static count. At `f46cb71` `tests/renderer/` holds 40 files. No tests were run in either scan.
- **Coverage**: v8, with an 80% line floor across `src/**` and `.opencode/plugins/*.js`, plus per-file 80% floors for the agent-dialog modules (`vitest.config.mjs`). CI runs `npx vitest run tests/ --coverage`.
- **Tooltip tests today**: only the chart tooltip is tested (`TokenDetail.test.jsx` l.191-205: open on focus, arrows, Esc). The split-bar row tip has no test. Nothing tests hover anywhere.

## Lint, Format, CI

| Check | State |
|---|---|
| ESLint 9 flat config | in CI (`npx eslint .`); a small rule set (recommended, react-hooks, react `jsx-uses-vars`) |
| Prettier | in CI (`npx prettier --check .`) |
| Secret scan | gitleaks on every PR commit |
| Build | the mac universal dmg and the Linux deb on every PR; the glibc check on Linux |

`team.md` still says coverage, ESLint and Prettier are "not set up yet". That is out of date: all three run in `.github/workflows/release.yml`.

## Quality Ratings

| Aspect | Rating | Evidence |
|---|---|---|
| Naming clarity | good | intent-revealing names; story ids in the headers |
| Function size | fair | most are small and pure; `ipc.js` (891 lines), `agentHooks.js` (864) and `App.jsx` (732) are large |
| Error handling | good | never-throw readers, the last good value, root confinement, warnings shown |
| Test presence | good | 111 test files, coverage floors; the gaps are the DAG view and the tooltips |
| Duplication | fair | `debounce` is written twice in `watcher.js`; three tooltip mechanisms in the renderer, with two near-identical coral tip styles (`theme.css:679` and `:709`) |
| Accessibility | fair | names and `role="img"` labels are kept with care; native titles never show on focus, and the ⓘ info tip is not focusable |
| Dead code | good | 0 TODO/FIXME, 4 `eslint-disable` lines |

## Technical Debt

- 37 `ponytail:` comments mark known ceilings (at `721e051`). Examples: the unbounded caches in `projectService.js`; the HEAD watch, which does not work in a worktree (`ipc.js` `watchGitHead`); the picker regexes tied to Claude Code's layout.
- `.thadeus/tokens/<intent>.json` is written into the project but is neither ignored nor committed, so it shows as untracked.
- `.opencode/plugins/thadeus-dialog.js` is app-owned code inside a harness folder. It is linted and covered, but sits beside AI-DLC's install.

## Brownfield Notes for US-0414

The site numbers refer to the table in the intent's `developer-scan.md`.

1. **The reference has gaps.** `.token-detail-row-tip` is CSS-only. It has no `role="tooltip"` or `aria-describedby`, it is never measured, so it does not stay inside the window, and it can be clipped by `.lcars-frame-body { overflow: auto }`. The shared tooltip keeps its look (coral 2 px border, `2px 12px 2px 2px` corner, `var(--bg)`, tabular figures) but needs its own placement.
2. **Disabled controls.** `ResumeButton` (site 27) sets `title` only while the button is `disabled`. A disabled button takes no focus and no pointer events in Chromium, so the reason never shows by keyboard. A wrapper or `aria-disabled` is needed.
3. **Native lists.** The disabled `<option>` in the quick-command `<select>` (site 29) cannot host a DOM tooltip. Its text needs another place, or it stays native as a stated exception.
4. **Children inside buttons** (sites 5, 7-9, 12, 14, 15) cannot be focused. To be reachable by keyboard, their text moves to the parent button's tooltip or description.
5. **Accessible names.** Sites 3, 4, 12, 18 and 28 already have an `aria-label`, which must stay when `title` goes. Sites 2, 6, 11, 13 and 31 are named by their text, and their title adds detail that should become `aria-describedby`.
6. **Raw data, not `t()`.** Sites 1, 2, 6, 9, 21, 25, 26, 30 and 31 show data (branch, path, date, error, docs status, href, name). Only the label texts need `t()`.
7. **Tests that assert `.title`** must change with the code: `ResumeButton.test.jsx` (11 asserts), `IntentList.test.jsx` (3), `CostPanel.test.jsx` (1), `TerminalPanel.test.jsx` (1).
8. **jsdom does no layout.** An edge-flip test must stub `getBoundingClientRect` and `innerWidth`/`innerHeight`, or the flip rule must be a pure function that is tested on its own.
9. **Stacking.** The tips use `z-index: 2`. The notices (40, 50) and the dialog (100) sit above them; a tooltip shown inside the agent dialog would need a layer above 100.
10. **Motion.** The row tip shows through opacity with no transition. Any fade must follow `data-motion` (Dämpad/Av draw at once).
