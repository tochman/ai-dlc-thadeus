# Requirements: US-0414 one LCARS tooltip across the app

## Intent analysis

The person likes the split-bar tooltip in the token detail view and wants every tooltip in the app to look and behave like it. Today tooltips come in three kinds that share nothing: 31 native `title=`, the CSS row tip, and the visx chart tooltip. The goal is one shared tooltip, used everywhere, that keyboard users can reach and that stays inside the window. This is a brownfield change confined to the renderer, touching about 15 view files.

Sources: US-0414 in `docs/features/epic-04-branding-and-desktop.md`; the inventory in `inception/reverse-engineering/developer-scan.md`; answers Q1–Q5 in `requirements-analysis-questions.md`.

## Functional requirements

**FR1 One shared tooltip component (Q1)**
- FR1.1 A `Tooltip` component in `src/renderer` renders into `document.body` through a React portal. It looks like today's `.token-detail-row-tip`: a 2 px coral border, the `2px 12px 2px 2px` LCARS corner, `var(--bg)`, `var(--text)`, 13 px, tabular figures and `6px 10px` padding. The look comes from one CSS class, and no place keeps its own tooltip style.
- FR1.2 It opens on pointer hover and on keyboard focus of its anchor, and closes on leave, on blur and on Esc.
- FR1.3 It has `role="tooltip"` and an id, and while open the anchor points to it with `aria-describedby`. Elements with an `aria-label` keep it.
- FR1.4 It measures its anchor and itself. It opens below the anchor; if there is no room below it opens above, and it shifts sideways so it stays at least 4 px inside the window on every side. The placement is a pure function so it can be tested.
- FR1.5 Its z-index sits above the notices (40, 50) and below the dialogs (100).

**FR2 Native tooltips replaced (Q2, Q3, Q4)**
- FR2.1 All 31 native `title=` tooltips in the inventory use the shared tooltip, and no `title=` stays on an element in `src/renderer` (the `CostTable` and `Section` `title` props are captions, not tooltips, and stay).
- FR2.2 The 14 tooltips on plain text become focusable (`tabIndex=0`), so they open on focus as well as on hover (Q2 A).
- FR2.3 The 7 tooltips on parts of a button keep their own hover tooltip. The button itself shows their combined text when it gets keyboard focus (Q3 B, Q5).
- FR2.4 The Resume button uses `aria-disabled` instead of `disabled`: it can be focused and hovered and shows why it cannot run, and a click does nothing while it is unavailable (Q4 A).
- FR2.5 The quick-command list's disabled "no command" option loses its own tooltip, and its hint appears in the list's tooltip (Q4 A).

**FR3 The custom tooltips use it too**
- FR3.1 The split-bar row tip in `TokenDetail.jsx` uses the shared tooltip.
- FR3.2 The "Tokens over time" chart tooltip keeps its own positioning (visx) and focus behaviour, but takes the shared look from the same CSS class.

**FR4 Texts**
- FR4.1 Every tooltip label text goes through `t()` with the same keys in `sv.json` and `en.json`. Data values (paths, branch, dates, errors, figures) are shown as they are.

## Non-functional requirements

- NFR1 Tests:
  - the shared tooltip opens on focus and on hover, and closes on Esc;
  - the placement function flips and clamps at each edge;
  - a test fails if any `title=` attribute is left in `src/renderer`.
- NFR2 Accessibility: no anchor loses its accessible name, and focus order follows the document.
- NFR3 Testing posture: TDD (test first), the full suite green, and the 80% line-coverage floor kept. The existing tests that check `.title` (ResumeButton, IntentList, CostPanel, TerminalPanel) are changed to check the tooltip instead.

## Constraints

- No new dependency (Q1 A). Renderer only: no IPC or main-process change.
- The LCARS look is strict: coral border, LCARS corner, no other new colours.

## Assumptions

- [assumption] Tooltips open without a delay on focus and after a short delay (about 300 ms) on hover, so moving the pointer across a list does not flash tooltips.
- [assumption] The chart tooltip keeps visx positioning because it follows the pointer inside the chart. The visx placement is clamped on the right only today, so it is clamped on the left too.

## Out of scope

- Tooltips in the Monaco editor's own UI, and native OS menus.
- New tooltip texts where none exist today.

## Open questions

None.
