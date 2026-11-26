# Requirements Analysis — Questions (US-1301 Rework cost)

Facts found: the ledger has per-stage totals but no timestamps, so two attempts at one stage are summed. The readings (`.thadeus/tokens/<intent>.json`) are timestamped but per intent only. An attempt's cost can therefore only come from the reading delta across its audit window. A loop-back is a `STAGE_JUMPED` BACKWARD from build-and-test; a redo is `STAGE_JUMPED` REDO; a rejection is `GATE_REJECTED`. There is no per-release cost view yet (US-1303 builds the story, epic and release roll-up).

## Question 1
What counts as thrown away when the workflow jumps back (a backward jump or a loop-back)?

A. Only the attempt of the stage the jump left from (its window up to the jump)
B. The attempts of every stage between the target and the source, since their last approval (what the jump invalidated)
C. Like B, but only the stages the jump's `Invalidated Downstream Artifacts` field names
X. Other (please specify)

[Answer]: B

## Question 2
US-1301 asks for rework "per release". There is no release cost view until US-1303. What should US-1301 do?

A. Show rework per release now, linking intents to releases through the story IDs in their description (as velocity does)
B. Leave the per-release figure to US-1303, which adds it to its release roll-up; US-1301 shows per intent and over time
X. Other (please specify)

[Answer]: B

## Question 3
How should "rework over time" be shown in the project overview?

A. Rework as a share of cost per month
B. Rework next to the cost in the existing cost-per-intent chart, in date order
X. Other (please specify)

[Answer]: B

## Question 4
When an intent has no readings for an attempt's window (an older intent, or a gap), what should the figure do?

A. Rebuild it from the transcript calls (as US-0215 does) and label it an estimate
B. Leave the attempt out of the sum, list it with "no readings for this window"
X. Other (please specify)

[Answer]: A
