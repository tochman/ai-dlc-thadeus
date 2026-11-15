# Requirements Analysis Questions — US-0411 Pipeline stages as LCARS cards

Context: the story's acceptance criteria are clear. These three questions settle what the story leaves open. The card's body is assumed to keep what the block shows today ("NN · Status", the mismatch flag, model and cost on the current stage).

## Q1. [Design] How many segments does the level bar have?

The records give per-unit progress for a stage built unit by unit: the runtime graph lists one instance per unit with its outcome, so "2 of 5 units approved" is known. Other stages are only done or not done.

A. One segment per unit (5 units, 5 segments); a stage without units has a single segment, lit when done
B. A fixed number of segments (for example 5) on every card, lit in proportion to units approved; done lights all, not done none
C. One segment per unit, capped at 8; above that, lit in proportion
X. Other (please specify)

[Answer]: C

## Q2. [Design] What does the footer's short code show?

The story says "agent or duration". Today a stage carries its agent (for example `aidlc-product-agent`) and, once started, a duration.

A. The duration once the stage has one, otherwise the agent's short name (`product`)
B. Always the agent's short name; duration stays in the tooltip and the opened details
C. Always the duration (`—` before the stage starts); agent stays in the tooltip
X. Other (please specify)

[Answer]: X. Both (the agent's short name and the duration)

## Q3. [Design] A stage waiting for your approval: blue or coral?

US-0402 made a stage awaiting approval pulse coral, so it stands out as needing you. This story says the current card is filled blue.

A. Filled blue like every current card, with the coral pulse kept as its glow
B. Filled coral instead of blue, pulsing, so "needs you" stays its own colour
C. Filled blue with the ordinary current glow; the coral pulse goes
X. Other (please specify)

[Answer]: B
