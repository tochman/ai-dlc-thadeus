# Rough Mockups Questions: US-0208, detailed token view from the side diagram

The small token view (`TokenView.jsx`) shows four bar meters and a rate waveform for the running intent. The cost ledger holds token totals per stage, agent and model, but **no timestamps**. The only "over time" data is the readings the app takes itself while it watches a live run (up to 120 of them, lost when the app closes). These questions settle the layout before the wireframes.

## Question 1
Where should the large view open when the small token view is clicked?

A. As a full-size overlay above the project view, with an LCARS frame; Esc or Close returns to where you were
B. As a "Tokens" section in the left arm under the intent (a sub-block like the other sections); the click selects it
C. In place of the intent's main panel, with a Back bar
X. Other (please specify)

[Answer]: C

## Question 2
How should "tokens over time" be shown, given the ledger has no timestamps?

A. Live: from the app's own readings while it is open; for a finished intent (or after a restart), the same diagrams step through the stages in pipeline order instead of time
B. Stages in pipeline order only, live or not; the rate waveform stays in the small view
C. Store the app's readings in a small file per intent, so time history survives a restart (new stored data)
X. Other (please specify)

[Answer]: C

## Question 3
What should the diagrams look like?

A. LCARS-native: segmented bars, stacked bands and stepped waveforms like the small view, in the theme's colours
B. Ordinary charts (lines, areas, donuts) drawn in LCARS colours
X. Other (please specify)

[Answer]: X. A chart library may be pulled in, styled as LCARS as much as possible

## Question 4
Where should the table view of the numbers sit?

A. A Diagram / Table switch on each diagram's frame
B. One table for the whole view, behind a single Table switch at the top
X. Other (please specify)

[Answer]: A
