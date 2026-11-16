# Interaction Spec: US-0208, detailed token view

## Component: TokenView (small, existing)

- **Purpose:** opens the detail (FR1).
- **Props:** add `onOpen()`.
- **States:** default, hover (brightness 1.15), focus (2px `--steel` ring), stale (existing sentence).
- **Interaction:** click, Enter or Space calls `onOpen`. Nothing else changes.

## Component: TokenDetail (new, `src/renderer/TokenDetail.jsx`)

- **Purpose:** replaces the intent's main panel (FR1, FR3).
- **Props:** `cost` (as `project:cost`), `dirName`, `live`, `readings` (from main, FR2), `onBack()`.
- **States:**
  - LIVE (intent in flight): updates on each cost refresh.
  - RECORDED (finished).
  - No readings: the over-time and rate frames show the one-sentence message (FR6).
  - No ledger entry: every frame shows its message.
- **Interaction:**
  - Back button and Esc call `onBack`, and focus returns to the small view.
  - Focus moves to the `h2` on open.

## Component: ChartFrame (new)

- **Purpose:** an LCARS frame around one chart.
- **Props:** `title`, `modes` (`['diagram','table']`, plus `['tokens','usd']` for the splits), `children(mode, measure)`.
- **States:** Diagram or Table [mockup Q4]; Tokens or $ [Q2]. Both start on Diagram and Tokens and are not saved.
- **Interaction:** switches are `.lcars-block--sm` buttons with `aria-pressed`. A switch never moves focus.

## Charts (visx)

- **Over time:** an `AreaStack` of the five kinds against elapsed time [Q1].
- **Rate:** a small stepped `LinePath` in the right column, tokens per minute between consecutive readings, with the latest figure under it (visual mockups).
- **Splits:** a horizontal `BarStack` (Tokens) or `Bar` ($).
  - Stages in pipeline order.
  - Agents and models largest first, at most 12 rows; the rest summed as "other".
- **Tooltip:** shown on pointer move and on keyboard focus of a point or bar. Points are focusable by arrow keys inside a focused chart, and Esc hides the tooltip.
- **Table:** the same rows as the diagram, numbers right-aligned in tabular figures.
- **Motion:** with full motion, new data eases in over 300 ms; reduced and off draw straight away (the `data-motion` rules).

## Data flow

- Main stores a reading on each ledger change while the intent runs, at most one per 30 s, in `.thadeus/tokens/<dir>.json` (FR2).
- The renderer asks for the readings with `tokens:readings` (projectId, dirName) when the view opens, and again on each cost refresh while live.
