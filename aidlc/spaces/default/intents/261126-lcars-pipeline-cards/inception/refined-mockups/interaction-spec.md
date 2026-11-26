# Interaction Spec — US-0412 LCARS pipeline cards

## Stage card

| Field | Value |
|---|---|
| Component | `StageBlock` (`src/renderer/Pipeline.jsx`), the `.stage-card` button |
| Description | One stage as an LCARS elbow card that shows its state and plays the effects below |
| Category | display (with a button that opens the stage's files) |

### States

| State | Description | Trigger |
|---|---|---|
| default | Elbow card in its status colour (mockups §2) | render |
| hover | Brightens (`filter: brightness(1.15)`, as today) | mouseover |
| focus | Amber focus outline, all tooltips shown (as today, US-0414) | Tab |
| expanded | Files open below, 1 px outline (as today) | click, Enter, Space |
| powering-up | Fades in and slides in, staggered | view opens, or another intent's pipeline shows |
| swept | One light band crosses the card | its status changes, not to done |
| flashing | Brightens twice, then the done look | its status becomes done |
| empty | No stages: "no stages" text as today; no power-up | pipeline has no phases |

### Effects (Full only)

| Effect | Story | Trigger | Animates | Timing |
|---|---|---|---|---|
| Power-up | US2.1 | mount, or the intent id changes | `opacity` 0→1, `transform: translateX(-12px)`→none | 240 ms ease-out each; card n starts at min(n × 40 ms, 360 ms), so the last ends by 600 ms |
| Sweep | US3.1 | status differs from the previous render, same intent, new status not done | a `::after` band, `transform: translateX(-100%)`→`translateX(400%)` | 600 ms ease-out, once |
| Flash | US3.2 | status becomes done, same intent | `filter: brightness(1)`→`1.6`→`1`→`1.6`→`1` | 800 ms, 2 flashes (2.5 a second) |
| Level fill | US3.3 | approved unit count goes up, same intent | the new segment's `transform: scaleX(0)`→`1`, origin left | 300 ms ease-out |

Rules:

- Change detection compares each stage's status and approved count with the previous render, keyed by slug. The first render, and the first render after an intent switch, play only the power-up.
- Several changes in one update all play at the same time (requirements Q1).
- An effect that is still running when the same card changes again restarts.
- Effects add no text, no `aria-live` and no tooltip; what the card says and how it is read out does not change.

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | native `<button>`, unchanged |
| Keyboard | Tab to focus, Enter or Space to open the files, unchanged |
| Label | the button text: number, slug, status, flags (number first now, so "03, requirements-analysis, in progress") |
| Contrast | dark text on steel and coral as today (AA) |
| Screen reader | nothing announced for an effect |
| Focus | an effect never moves or steals focus |

## Decisions made in this stage

- **The sweep moves a band with `transform`**, not the existing `lcars-sweep` keyframes, which move `background-position`. This keeps NFR1 (only `transform`, `opacity`, `filter`, `box-shadow`).
- **The elbow slides with the whole card** in the power-up (12 px), rather than as a separate part. It reads as the elbow leading in, and keeps the card one element.
- **The done look's elbow is an outline** drawn with an inset 1 px `box-shadow` on the elbow, so the card keeps its shape without a fill.
