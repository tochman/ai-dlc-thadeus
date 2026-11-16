# Requirements Analysis Questions: US-0303 Project velocity

The story's acceptance criteria already say what to measure. These questions settle the choices the code scan left open.

## Q1. Where should velocity appear?

A. A new project view "Velocity" in the LCARS arm (project and story numbers), plus a "Velocity" tab in the intent detail (that intent's numbers)
B. Only a new project view; one intent's numbers are a row you can open there
C. A section inside the existing cost view (CostPanel), next to cost
X. Other (please specify)

[Answer]: A

## Q2. How should parked time count in an intent's length?

A. Leave parked time out of the active time and show it as its own figure ("parked 2 d")
B. Count it as part of the total time, with nothing shown separately
C. Show both totals: calendar time and active time
X. Other (please specify)

[Answer]: A

## Q3. What counts as "waiting at the person's approvals"?

A. Stage gates (awaiting approval → approved or rejected) and Code Generation plan approvals, shown together
B. The same, but shown as two separate figures
C. Stage gates only
X. Other (please specify)

[Answer]: A

## Q4. Where does a story's 🚧 start come from?

Stories are squash-merged, so on `main` the 🚧 and the ✅ often land in the same commit.

A. From the intent that worked on the story: its start is the 🚧 time. ✅ is the merge commit that set ✅, and "Released" is the tag date. If no intent names the story, fall back to git and show the span as unknown when it is zero.
B. From git only: the first commit on `main` with each marker. A zero span is shown as "same commit".
C. From git over every branch, not just `main`
X. Other (please specify)

[Answer]: A

## Q5. How should the trend be shown?

A. A bar chart per week (or per month, switchable) of finished intents and stories, with the average intent length as a line
B. Numbers only: this period against the previous one, with an up or down marker
C. Both: the chart and the figures for this period against the previous one
X. Other (please specify)

[Answer]: A

## Q6. Which intents count?

A. All intents in the active space except archived ones. Unfinished intents are shown with their numbers so far but are not counted in "finished" or the averages.
B. All intents, archived ones included
C. Only intents that finished
X. Other (please specify)

[Answer]: B
