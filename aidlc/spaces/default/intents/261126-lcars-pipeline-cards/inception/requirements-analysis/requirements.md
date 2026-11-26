# Requirements — US-0412 LCARS pipeline cards

## Sources

- Initial description: US-0412 story text and acceptance criteria [desc]
- Workflow-selected scope: visual-express (mockup approved before code) [scope]
- Approved mockups: `ideation/rough-mockups/wireframes.md`, `user-flow.md` (answers Q1–Q3 there)
- This stage's answers: [Q1] all changed cards get their effect; [Q2] the power-up also plays on intent switch
- Current code: `src/renderer/Pipeline.jsx` (`StageBlock`, `LevelBar`), `stage-card` rules and the `data-motion` rules in `src/renderer/theme.css`

## Intent

Make the pipeline feel like a living LCARS console: the stage cards get an LCARS elbow, and they move with purpose when the view opens and when work changes them, while the animations setting keeps full control.

## Functional requirements

**FR1 Elbow card**
- FR1.1 Each stage card's head strip bends down its left edge as one LCARS elbow shape, in the card's state colour, with a rounded inner corner.
- FR1.2 The stage number ("03") sits in the elbow's top block; the body line starts with the status. A stage without a number shows "—" there.
- FR1.3 The state colours stay as US-0411 set them: current steel fill, needs-you coral fill, done grey outline (elbow outlined too), skipped dashed and muted, mismatch or failure soft coral outline and flag.
- FR1.4 The grid stays 3 cards per row; at a 1280 px wide window no card text overflows its card.

**FR2 Power-up**
- FR2.1 Each time the Pipeline view opens, and each time it shows another intent's pipeline [Q2], the cards light up one after another, left to right and row by row.
- FR2.2 Each card fades in while its elbow slides in from the left; the last card has finished within 600 ms of the first.

**FR3 Sweep**
- FR3.1 When a stage's status changes while the view is open, one band of light passes across that card once, left to right, in about 600 ms. A first render, or a new intent's pipeline, plays no sweep.
- FR3.2 When several stages change in one update, each changed card gets its effect at the same time [Q1].

**FR4 Flash**
- FR4.1 When a stage becomes done while the view is open, the card brightens twice over about 800 ms and settles into the done look. A stage that becomes done gets the flash, not the sweep.

**FR5 Level bar fill**
- FR5.1 When a stage's count of approved units goes up while the view is open, each newly lit segment grows in from the left in about 300 ms.

**FR6 Animation setting**
- FR6.1 Full: every effect above, plus today's breathing and coral pulse.
- FR6.2 Reduced: nothing moves; cards and new states show at once; the static steel glow on the current card and the coral ring on a needs-you card stay as today.
- FR6.3 Off: no animation and no transition at all.

## Non-functional requirements

- NFR1 Only `transform`, `opacity`, `filter` and `box-shadow` animate.
- NFR2 Nothing flashes more than 3 times a second (the flash is 2 in 800 ms, 2.5 a second).
- NFR3 Accessibility unchanged: each card is still one button whose text includes its number and status; text on steel and coral keeps WCAG AA contrast; the effects add no text and are not read out.
- NFR4 No new user-facing text; if any is needed, it goes through `t()` in Swedish and English.

## Constraints

- LCARS look throughout (project rule); reuse the shared `.lcars-card` parts and the existing keyframes where they fit.
- No new dependency. Tests first (TDD); coverage stays at or above 80%.

## Assumptions

- [assumption] The pipeline data is refreshed in place while the view is open, so a status change can be found by comparing a stage's previous status with its new one, keyed by its slug.

## Out of scope

- The intent tile's dot indicator and other views that show stages.
- Sound.

## Assumptions & Open Questions

None.
