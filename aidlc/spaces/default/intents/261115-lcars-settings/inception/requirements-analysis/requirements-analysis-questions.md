# Requirements Analysis Questions: US-0410 Settings in LCARS tabs

The story (`docs/features/epic-04-branding-and-desktop.md`, US-0410) already sets the tabs, the tools and the card style. These questions settle what it leaves open.

## Q1. [Design] Where do the tabs sit?

Today Settings is one long page inside the main panel, next to the app's left rail.

A. A vertical column of LCARS pills on the left edge of the Settings panel, joined to the frame by an elbow (like the side rail)
B. A horizontal row of LCARS pills across the top of the panel, under the header bar
C. In the app's left rail itself, as sub-buttons under SETTINGS
X. Other (please specify)

[Answer]: C

## Q2. [Design] How much motion on a tab change (with animations on Full)?

A. Light: the pill lights up and the panel fades in (about 200 ms)
B. Full LCARS: the pill lights up, a sweep runs along the frame to the panel, and the rows appear one after another
C. Only the pill lights up; the panel swaps with no motion
X. Other (please specify)

[Answer]: B

## Q3. [Product] Which tab opens when you open Settings?

A. Always Tools
B. The tab you used last (remembered between app starts)
C. Tools when a tool is missing, otherwise the tab you used last
X. Other (please specify)

[Answer]: B

## Q4. [Product] What should a missing tool show (for example `gh` not installed)?

A. "Not found" and what the app needs it for, plus Choose…
B. As A, plus how to install it (for example `brew install gh`, a link to opencode's install page)
C. As B, plus a warning mark on SETTINGS in the left rail while a tool is missing
X. Other (please specify)

[Answer]: A
