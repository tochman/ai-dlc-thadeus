# Developer Code Scan: shared-tooltip (US-0414)

Focused scan of `src/renderer` at `f46cb71d05d86bea71fdc9d9e82e2087f67f8cc3`, depth Minimal. Code was read only; no tests, builds or app runs.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `src/renderer/TokenDetail.jsx` (whole file: the visx chart tooltip and the split-bar row tip)
  - `src/renderer/Lcars.jsx` (whole file)
  - `src/renderer/theme.css` (the token detail block l.642-735, `.info-tip` l.533, the z-index and overflow rules)
  - every `title=` site in `src/renderer` with its surrounding markup (table below)
  - `src/renderer/format.js` `tokenBreakdown`, `src/renderer/Pipeline.jsx` `stageDetails`, `src/renderer/SettingsView.jsx` `Section`, `src/renderer/CostTab.jsx` `CostTable`
- **Skimmed only**:
  - the rest of `src/renderer` (headers, imports, a search for hover, focus, portal and positioning code)
  - `src/shared/locales/{sv,en}.json` (the `cost` keys; 1244 lines each)
  - `tests/renderer/` (searched for title and tooltip assertions)
  - `package.json` (the visx and React versions)
- **Left out**: `node_modules/`, `out/`, `dist/`, `coverage/`, `tests/.tmp/`, `.thadeus/`, and AI-DLC's install and workspace

### Packages Found
- `src/renderer` — React 19 view layer — JSX/CSS — the sandboxed renderer (see the codekb `component-inventory.md`)

### Build System
- **Type**: electron-vite (unchanged; see the codekb `technology-stack.md`)
- **Config Files**: `electron.vite.config.mjs`, `vitest.config.mjs`
- **Build Dependencies**: the renderer bundles `src/shared/*` and the parsers `ledger`, `audit`, `features` and `releases`

### APIs Discovered
- No new surface. The tooltip work is renderer-only. It needs no IPC or bridge member.

### Frameworks & Libraries
- `@visx/tooltip` — ^4.0.0 — `Tooltip` and `useTooltip`, used only by the "Tokens over time" chart (`unstyled`, `applyPositionStyle`)
- react / react-dom — ^19.3.1 — no `createPortal` is used anywhere in `src/renderer` today
- react-i18next / i18next (ICU) — ^18.0.1 / ^27.1.1 — `useTranslation()` in components; `t` from `src/shared/i18n.js` in non-hook modules (`Lcars.jsx`, `format.js`, `Pipeline.jsx` `translate`)
- No positioning library (no floating-ui, popper or radix) is installed

### Test Coverage
- **Test Directories**: `tests/renderer/` (jsdom, Swedish locale)
- **Test Frameworks**: vitest 5.1.0, @testing-library/react ^16.3
- **Coverage Config**: present (`vitest.config.mjs`, 80% line floor)
- **Tests that touch tooltips today**:
  - `TokenDetail.test.jsx` l.191-205: focus on the chart shows `token-detail-tooltip`, arrows move it, Esc hides it. Nothing tests the split-bar row tip (`.token-detail-row-tip`).
  - These tests assert a native `title`, and they break when `title=` goes: `ResumeButton.test.jsx` (11 asserts, l.54-158), `IntentList.test.jsx` l.66 and l.115-116, `CostPanel.test.jsx` l.32 (`model-mismatch`), `TerminalPanel.test.jsx` l.154 (the disabled `<option>`).

### Code Quality Indicators
- **Linting**: ESLint and Prettier in CI (see the codekb `code-quality-assessment.md`)
- **CI/CD**: `.github/workflows/release.yml`
- **Documentation**: the module headers name their stories; `TokenDetail.jsx` l.1-4 names US-0208 NFR3, "tooltips show on focus too"

### Technical Debt Signals
- Tooltips are built three ways: native `title` (31 sites), a CSS-only absolute row tip, and the visx `Tooltip`. They share no class or component.
- Neither custom tooltip stays inside the window. The row tip is `position: absolute; top: calc(100% + 4px); left: 0; white-space: nowrap`. It is not clamped, it never flips, and it sits inside `.lcars-frame-body { overflow: auto }`, so it can be clipped or scroll its container. The chart clamps only on the right (`Math.min(tooltipLeft + 12, width - 220)`, a hard-coded 220 px width).
- The row tip has no `role="tooltip"` and no `aria-describedby`. It is always in the DOM (opacity 0), so its text is part of the row's content.
- `.info-tip` (CostTab l.17) is a `role="img"` span with `title` and `aria-label`. It is not focusable, so the keyboard cannot reach its explanation.

### Tooltip Inventory (every place that shows one today)

Interactive = the element itself takes focus or clicks. "Inside button" = a non-focusable child of an interactive element; its title only shows on hover over that child. "Text source" says whether the text is `t()` or raw data.

| # | File:line | Element | Interactive | Accessible name today | Text source |
|---|---|---|---|---|---|
| 1 | `App.jsx:493` | `span.app-branch` | no | its text (ellipsised) | raw branch |
| 2 | `App.jsx:529` | project tab `button.lcars-block` | yes | its text (`tab.name`) | raw `tab.root` path |
| 3 | `App.jsx:539` | ⚙ `button.arm-tool` | yes | `aria-label` (same text) | `t('app.projectSettingsFor')` |
| 4 | `App.jsx:548` | × `button.arm-tool` | yes | `aria-label` (same text) | `t('app.closeProject')` |
| 5 | `IntentList.jsx:39` | `span.intent-cost` | inside button | — | `t('cost.label' / 'cost.noEntry' / 'intents.costIncomplete')` |
| 6 | `IntentList.jsx:128` | intent row `button role=option` | yes (may be `disabled`) | its text | raw `i.date` |
| 7 | `IntentList.jsx:139` | plan name span | inside button | — | `t('intents.basedOn')` |
| 8 | `IntentList.jsx:146` | done/executed span | inside button | — | `t('intents.doneOfExecuted')` |
| 9 | `IntentList.jsx:156` | `span.tag-error` | inside button | — | raw `i.error` |
| 10 | `IntentDetail.jsx:184` | scope `span.lcars-chip` | no | — | `t('intents.basedOn' / 'intents.scopeLabel')` |
| 11 | `IntentDetail.jsx:196` | story `button.lcars-chip` | yes | its text (story id) | `t('intents.openStory')` |
| 12 | `Pipeline.jsx:60` | `span.stage-level role=img` | inside button | `aria-label` (same text) | `levelBar().label` |
| 13 | `Pipeline.jsx:91` | `button.stage-card` | yes | its text | `stageDetails()`: data plus `translate('pipeline.files')` |
| 14 | `Pipeline.jsx:102` | `span.stage-flag` | inside button | — | `t('pipeline.mismatchTitle')` |
| 15 | `Pipeline.jsx:111` | `span.stage-cost` | inside button | — | `t('cost.label')` plus `tokenBreakdown` (`t('cost.breakdown')`) |
| 16 | `CostPanel.jsx:110` | `span.cost-big-usd` | no | — | `t('cost.label')` |
| 17 | `CostPanel.jsx:132` | `p.cost-legacy` | no | — | `t('cost.legacyTitle')` |
| 18 | `CostTab.jsx:17` | `span.info-tip role=img` ⓘ | no (not focusable) | `aria-label` (same text) | `t('cost.explanation')` |
| 19 | `CostTab.jsx:21` | `span.tag-warn` | no | — | `t('cost.incompleteTitle')` |
| 20 | `CostTab.jsx:51` | tokens `td` | no | — | `tokenBreakdown` |
| 21 | `CostTab.jsx:74` | `span.tag-warn` | no | — | raw `models.error` |
| 22 | `CostTab.jsx:100` | `span.muted` | no | — | `t('cost.unknownTitle')` |
| 23 | `CostTab.jsx:105` | `span.tag-warn` (`model-mismatch`) | no | — | `t('cost.configuredFor')` |
| 24 | `ConfigEdit.jsx:468` | `span.tag-warn` | no | — | `t('configEdit.models.alignHint')` |
| 25 | `FeaturesView.jsx:23` | `StatusBadge` span | no | — | raw status text from the docs |
| 26 | `ArtifactReader.jsx:29` | relative link `span.md-link` | no | — | raw `href` |
| 27 | `ResumeButton.jsx:77` | `button.resume-button` | yes, but `disabled` exactly when the title is set | its text | `unavailable` (`t()` messages) |
| 28 | `TerminalPanel.jsx:206` | quick-command `select` | yes | `aria-label` (`terminal.quickMenu`) | `t('terminal.quickTitle')` |
| 29 | `TerminalPanel.jsx:216` | disabled `<option>` | native list, no DOM tooltip possible | its text | `t('terminal.noCommand')` |
| 30 | `Lcars.jsx:98` | `Readout` `span.lcars-readout-name` | no | — | raw `r.name` (ellipsised) |
| 31 | `editor/EditorPanel.jsx:177` | editor `button role=tab` | yes | its text (file name) | raw `x.rel` path |
| 32 | `TokenDetail.jsx:272` | `span.token-detail-row-tip` in a focusable `li` | yes (`tabIndex=0`) | the row text, tip included | `t('tokens.*')` plus figures |
| 33 | `TokenDetail.jsx:135` | visx `Tooltip.token-detail-tooltip` on the focusable chart group | yes (`tabIndex=0`) | `aria-describedby` while open | `t('tokens.*')`, `t('tokenDetail.cost')` |

Not tooltips, though `grep title=` finds them: `CostTable title=` (a `<caption>`; `CostPanel.jsx:137-138`, `CostTab.jsx:158-160`) and `Section title=` (an `<h2>`; `ProjectSettingsView.jsx:112, 200, 256`). The story's "about 39" counts these 8; the real native count is 31.

How the reference tooltip (row tip) is built:
- **Markup**: a `<span class="token-detail-row-tip">` inside each `li.token-detail-row tabIndex=0`. The text is joined with ` · ` from `t('tokens.<kind>')` and `formatTokens`/`formatUsd`.
- **CSS** (`theme.css:709-710`): a 2 px `var(--coral)` border, `border-radius: 2px 12px 2px 2px`, `background: var(--bg)`, `color: var(--text)`, 13 px, `font-variant-numeric: tabular-nums`, `padding: 6px 10px`, `z-index: 2`, `pointer-events: none`. It shows on `:hover` and `:focus-visible` of the row through `opacity`, with no JS and no motion rule.
- **Chart tooltip** (`theme.css:679-684`): the same coral border and background with radius `2px 14px 2px 2px`, `padding: 8px 12px`, a grid of label and value, and a coral head. It shows on focus, pointer move and arrows; Esc hides it (with `stopPropagation`).

## Handoff Summary
- **Intent-relevant finding**: 33 tooltip sites: 31 native `title`, the CSS-only row tip (`TokenDetail.jsx:272`, `theme.css:709-710`) and the visx chart tooltip (`TokenDetail.jsx:135-156`, `theme.css:679-684`). Only the last one has `role="tooltip"` and `aria-describedby`, and neither custom one keeps inside the window. 10 sites are interactive (rows 2, 3, 4, 6, 11, 13, 27, 28, 31, plus 29 as a native option); 7 are non-focusable children of a button (5, 7-9, 12, 14, 15); the other 14 are on plain text.
- **Risks / follow-up**:
  - `ResumeButton` shows its title only while it is `disabled`. A disabled button gets no focus and, in Chromium, no pointer events, so a focus or hover tooltip on the button itself never opens. It needs a wrapper, or `aria-disabled` instead of `disabled`.
  - A disabled `<option>` (row 29) cannot host a DOM tooltip; the text needs another home or must stay native.
  - Seven sites show raw data (paths, branch, date, error, docs text) rather than `t()` text. The "texts via `t()`" criterion applies to the label texts, not to data values.
  - Children inside a button are not focusable, so "reach it by keyboard" means the tooltip moves to the button or the text joins the button's description.
  - The tests listed under Test Coverage assert `.title` and must change with the code.
  - Staying inside the window needs measuring (`getBoundingClientRect` against `innerWidth`/`innerHeight`) or a portal, because `overflow: auto` containers (`.lcars-frame-body`, `.sidebar`, `.app-arm`) clip absolute children. No positioning library is installed.
  - The dialog and notice z-indexes are 100, 50 and 40 (`theme.css:1339, 472, 1214, 1110`); the tooltip z-index must be chosen against them.
