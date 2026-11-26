# User Stories — US-0412 LCARS pipeline cards

Sources: `inception/requirements-analysis/requirements.md` (FR1–FR6, NFR1–NFR4), personas in `personas.md`. "While the view is open" means the Pipeline view is showing and its data refreshes in place [assumption from requirements].

## US1 Card shape

### US1.1 Elbow card — Must Have
As Dana, I want each stage card to carry an LCARS elbow, so that the pipeline looks like part of the console. (FR1, NFR3, NFR4)

- AC1.1.1 Given a stage card, when it renders, then its head strip bends down the left edge as one elbow shape in the card's state colour, with a rounded inner corner.
- AC1.1.2 Given a stage with number 3, when it renders, then "03" sits in the elbow's top block and the body line starts with the status; given a stage with no number, then "—" sits there.
- AC1.1.3 Given each state (current, needs you, done, skipped, mismatch or failure), when it renders, then it keeps US-0411's look: steel fill, coral fill, grey outline with the elbow outlined, dashed and muted, soft coral outline and flag.
- AC1.1.4 Given a 1280 px wide window, when the Pipeline view shows, then the grid has 3 cards per row and no card text overflows its card.
- AC1.1.5 Given any card, when read by a screen reader, then it is one button whose text includes its number and status, with no new text added, and steel and coral text keeps WCAG AA contrast.

## US2 Power-up

### US2.1 Cards power up when a pipeline appears — Must Have
As Dana, I want the cards to light up in order when a pipeline appears, so that opening the view feels like a console coming online. (FR2)

- AC2.1.1 Given animations on Full, when the Pipeline view opens, then the cards appear one after another, left to right and row by row, each fading in while its elbow slides in from the left.
- AC2.1.2 Given the view is open, when the person switches to another intent, then that intent's cards power up the same way.
- AC2.1.3 Given any number of cards, when the power-up plays, then the last card has finished within 600 ms of the first.

## US3 State-change effects

### US3.1 Sweep on a status change — Must Have
As Dana, I want a band of light to pass over a card whose status changed, so that I notice what moved without watching every card. (FR3)

- AC3.1.1 Given the view is open, when a stage's status changes (and not to done), then one band of light passes across that card once, left to right, in about 600 ms.
- AC3.1.2 Given the view's first render, or a new intent's pipeline, when the cards show, then no card sweeps.
- AC3.1.3 Given one update changes several stages, when it arrives, then each changed card gets its effect at the same time.

### US3.2 Flash when a stage is done — Must Have
As Dana, I want a card to flash when its stage becomes done, so that I see completion as an event. (FR4, NFR2)

- AC3.2.1 Given the view is open, when a stage becomes done, then its card brightens twice over about 800 ms and settles into the done look.
- AC3.2.2 Given a stage becomes done, when its effect plays, then it gets the flash and not the sweep.
- AC3.2.3 Given the flash, when measured, then it never exceeds 3 flashes a second.

### US3.3 Level bar fills in — Should Have
As Dana, I want newly approved unit segments to grow in, so that I see progress inside a stage. (FR5)

- AC3.3.1 Given the view is open, when a stage's approved unit count goes from 2 to 3, then the third segment grows in from the left in about 300 ms and the first two do not move.
- AC3.3.2 Given the first render, when the level bar shows, then its lit segments show at once with no fill effect.

## US4 Animations setting

### US4.1 The effects follow the animations setting — Must Have
As Robin, I want the effects to obey the animations setting, so that nothing moves that I turned off. (FR6, NFR1, NFR2)

- AC4.1.1 Given Full, when the view is used, then every effect above plays, plus today's steel breathing and coral pulse.
- AC4.1.2 Given Reduced, when the view opens or a stage changes, then nothing moves, cards and new states show at once, and the static steel glow on the current card and the coral ring on a needs-you card stay.
- AC4.1.3 Given Off, when the view opens or a stage changes, then no animation or transition runs at all.
- AC4.1.4 Given any effect, when its CSS is inspected, then it animates only `transform`, `opacity`, `filter` and `box-shadow`.

## Dependencies

- US1.1 first: the power-up's elbow slide and the sweep and flash act on the elbow card.
- US3.1, US3.2 and US3.3 share one change check (previous status by stage slug); each is testable on its own.
- US4.1 applies to US2.1 and US3.x; its criteria can be tested on each effect as it lands.

## INVEST notes

Each story is one effect or one shape, small (under a day of work each), and testable in the renderer tests with the animations level set. US4.1 is a cross-cutting rule written as its own story, so Robin's needs are checked and not left as a side note.
