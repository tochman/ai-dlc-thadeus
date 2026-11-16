# Mockups: US-0208, detailed token view

The visual mockups are the source of truth: **https://claude.ai/artifact/WrphyHBekrup5wdVzwi8Yt** (private canvas, three boards). The person approved the style on 2026-11-16, after a first orange-heavy version was rejected. They match the app's own screens (`docs/screenshots/intents.png`, `cost.png`) and the person's LCARS reference.

## Style (all boards)

- The view sits in the main panel's thick slate frame (`#4a5370`, 14 px, large rounded corner), with slate bar segments above and below.
- Title in large steel-blue Antonio (`#7cc0ea`), for example "TOKENS · TOKEN-DETAIL-VIEW", with outlined slate tags under it (scope, story, intent dir; the dir tag outlined in steel).
- A small slate **‹ Back** block with a rounded left end, at top left of the title.
- Section titles in steel-blue Antonio with a thin slate rule; switches are slate blocks, the active one steel (`#4fa3d9`) with dark text.
- Cards are 3 px slate outlines with one rounded corner; names in white Antonio, figures in steel-blue Antonio.
- Orange (`#ff9e40`) and coral (`#ee6c56`) are sparing accents only: output tokens, the tooltip outline and its marker line.

## Board 1: Token detail, live

- **Tokens over time:** glowing stacked areas on a faint steel-deep grid, elapsed-time axis [Q1], legend in Antonio, Diagram / Table switch. Hovering or focusing shows a coral line and a coral-outlined tooltip with every kind and the cost.
- **By stage, by agent, by model:** outlined cards with stacked bars by kind and a Tokens / $ switch [Q2].
- **Right column**, like the intent view's live-tokens column:
  - Mode (● Live), Tokens and Cost as big Antonio numbers;
  - Recorded (time and readings count);
  - the token rate as a small glowing stepped line with "14 k tokens/min";
  - Model.

## Board 2: Table and $ modes

- **Table mode:** a plain table in Antonio. Grey uppercase headers, white figures and steel-blue cost, the hovered reading highlighted in steel, scrolling inside its frame.
- **$ mode:** one steel bar per row, the largest with a soft glow; tokens stay in the tooltip.

## Board 3: Finished intent and the small view

- A finished intent shows **Recorded** in the right column. A chart without readings shows a dashed slate box with one sentence: "No readings are stored for this intent; it finished before they were kept."
- The small live-tokens view becomes one button with a slate "Open ›" end cap and a steel focus ring.

## Changed from the first written mockups

- The token rate moved from its own large frame into the right column.
- The split cards carry only the Tokens / $ switch in the mockup. Whether they also get Diagram / Table [mockup Q4] is open for the person at this gate.
