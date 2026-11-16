# Requirements Analysis Questions: US-0208, detailed token view

The rough mockups are approved: the view replaces the intent's main panel, stores token readings so time history survives a restart, uses a chart library styled as LCARS, and has a Diagram / Table switch per chart. Three things are left open.

## Question 1
Where should the token readings be stored?

A. In the app's own data folder (`~/Library/Application Support/aidlc-dash/`), one file per project and intent: private to this machine, never committed
B. In the project's `.thadeus/` folder, one file per intent: beside the project, and a teammate who clones it gets the history if the folder is committed
X. Other (please specify)

[Answer]: B

## Question 2
Which chart library should be pulled in?

A. visx (Airbnb): small SVG building blocks for React; every bar, line and label is ours to style, so it can look fully LCARS; more code per chart
B. Recharts: ready-made React SVG charts with tooltips and legends; quick to build, harder to make look LCARS; the largest of the three
C. uPlot: very small and fast canvas charts; little styling and weak accessibility for tooltips
X. Other (please specify)

[Answer]: A

## Question 3
How often should a reading be stored, and how many kept?

A. On every change of the cost ledger while the intent runs, at most one per 30 seconds, up to 2000 readings per intent (about 16 hours of work); older readings are thinned, not dropped
B. One reading per minute while the intent runs, up to 1440 (a day); the oldest are dropped
X. Other (please specify)

[Answer]: A
