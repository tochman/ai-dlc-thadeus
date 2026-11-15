# Requirements — US-0411 Pipeline stages as LCARS cards

## Intent

Make a workflow's position readable at a glance: each pipeline stage becomes an LCARS card (the shared `.lcars-card` from US-0410), the current one lit. Source: the story in `docs/features/epic-04-branding-and-desktop.md` and the initial description.

## Functional requirements

**FR1 Card anatomy.** Each stage in `src/renderer/Pipeline.jsx` renders as an `.lcars-card`:
- FR1.1 Header strip with the stage name, aligned right.
- FR1.2 Dark body holding what the block shows today: "NN · Status", the current marker, the mismatch flag, and model and cost on the current stage.
- FR1.3 Footer strip with the agent's short name (`aidlc-product-agent` → `product`) and the duration once the stage has one (Q2: both), plus the level bar (FR2).

**FR2 Level bar from the records.** No number is made up.
- FR2.1 A stage built unit by unit shows one segment per unit in the plan, units approved lit; approved = the stage's runtime-graph `instances` with outcome `approved`, units = the plan's units (`bolt_dag`).
- FR2.2 Above 8 units the bar keeps 8 segments, lit in proportion (approved / units × 8, rounded down; all 8 only when every unit is approved) (Q1).
- FR2.3 Any other stage has one segment, lit when the stage is done.
- FR2.4 The bar carries an accessible label with the real count ("2 of 5 units approved", or done / not done) through `t()`.

**FR3 Colour by state.**
- FR3.1 The current stage (in progress, revising, or the state's current stage) is filled blue like a selected card.
- FR3.2 A stage awaiting approval is filled coral instead, so "needs you" keeps its own colour (Q3).
- FR3.3 Done stages are grey outlines; skipped ones are muted.
- FR3.4 A mismatch or failure shows in orange (outline and flag), whatever the other state.

**FR4 Glow follows the animations setting.** The current card breathes, an awaiting-approval card pulses; Dämpad (Reduced) gives a static glow, Av (Off) none, through the existing `data-motion` attribute.

**FR5 Behaviour kept.** Clicking a card still toggles its files and details below the phase row (`aria-expanded`); `data-testid="pipeline-stage"` and `pipeline-stage-cost` stay; cost, mismatch and status keep their titles; every new text goes through `t()` in `sv.json` and `en.json`.

## Non-functional requirements

- **NFR1** Motion uses only transform, opacity, `filter` and `box-shadow`; nothing flashes more than 3 times per second (US-0402).
- **NFR2** Text on the blue and coral fills keeps at least WCAG AA contrast (4.5:1).
- **NFR3** Tests first (TDD); the full `npx vitest run tests/` suite stays green.

## Constraints

- Reuse the `.lcars-card` classes in `src/renderer/theme.css`; no new dependency.
- Per-unit counts must reach the renderer: `src/main/parsers/runtimeGraph.js` and `pipeline.js` expose approved and total units per stage.

## Assumptions

- A stage with `instances` but no `bolt_dag` uses the number of instances as its unit total. [assumption]
- "Failure" means a stage whose runtime outcome is neither approved nor empty (for example `rejected`), shown like a mismatch. [assumption]

## Out of scope

- The flash on a completed stage and tab slide transitions (US-0402 leftovers).
- The intent's dot indicator (`pipelineSteps`) is unchanged.

## Open questions

None.
