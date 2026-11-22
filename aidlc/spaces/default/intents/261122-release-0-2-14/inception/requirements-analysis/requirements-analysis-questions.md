# Requirements Analysis Questions: Release v0.2.14

The four stories (US-0038, US-0039, US-0037, US-0040) already carry their acceptance criteria in `docs/features/epic-00-fixes.md`. These questions cover only what the stories leave open.

## Q1. [Product owner] Compact while the agent is working (US-0039)

Fresh session ends the session, so asking AI-DLC to park first and resuming after `/clear` is safe. Compact keeps the session, so after `/compact` the work must be picked up again.

A. Ask AI-DLC to stop at its next safe point (park), then type `/compact` and `/aidlc --resume` when it stops
B. Keep Compact as it is (wait for the agent to be idle); only Fresh session gets the park request
X. Other (please specify)

[Answer]: A

## Q2. [Product owner] A separate Unpark button on a parked intent (US-0037)

Resume on a parked intent already unparks it first. Unpark alone only clears the parked mark (and makes the intent active) without typing `/aidlc`.

A. Drop Unpark; a parked intent shows the parked state and one "Unpark and resume at <stage>" button
B. Keep Unpark as a small secondary control next to the resume button, for unparking without resuming
X. Other (please specify)

[Answer]: A

## Q3. [Product owner] A "Last activity" sort in the intent list (US-0040)

The story puts open work first and sorts the rest by creation time. The app already reads each intent's last activity.

A. No new sort; the date sort as the story describes is enough
B. Add "Last activity" as a fourth sort option, next to date, cost and name
X. Other (please specify)

[Answer]: A
