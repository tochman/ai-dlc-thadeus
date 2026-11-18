# Requirements Analysis Questions: US-0215

What I found in the code and the data, as background for the questions:
- The token view's "Tokens over time" diagram has no 120-reading window. That window only applies to the live meter (`HISTORY_MAX` in `tokenFlow.js`). Stored readings are capped at 2000, with thinning (`tokenReadings.js`), so the first acceptance criterion mostly holds already and only needs a test.
- The ledger names 84 sessions across 41 intents, all Claude Code transcripts. **22 of those sessions belong to more than one intent**, because one chat often carries several stories. A rebuild therefore has to pick out the model calls that belong to this intent.
- The ledger keeps totals per session and intent, but no timestamps.

## Q1. [Developer] Which model calls in a shared session belong to this intent?
A session's transcript can hold the work of several intents (22 of 84 sessions do).
A. Only the calls made while one of this intent's stages was running, using the stage start and end times in its audit log. Most accurate, including when two intents take turns in one chat.
B. Only the calls between this intent's first and last audit event. Simpler, but counts another intent's calls when two of them take turns in one chat.
C. The whole session. Simplest, but overcounts every shared session.
X. Other (please specify)

[Answer]: A

## Q2. [Product] Readings were recorded for only part of the run (the app was opened mid-run). Where does the diagram come from?
A. The recorded readings, as today. The rebuild is used only when there are no readings at all.
B. The transcripts, whenever they cover more of the run than the readings do.
C. Both merged into one line.
X. Other (please specify)

[Answer]: A

## Q3. [Product] Where does the figures strip's estimated cost come from?
A. The ledger's cost for the intent (what the cost view shows today), labelled as an estimate.
B. A cost worked out again from the rebuilt token counts with the app's price table.
X. Other (please specify)

[Answer]: A

## Q4. [Product] What does "duration" in the figures strip mean?
A. The time from the first model call (or reading) to the last: the working span.
B. The time from the workflow's start to its end in the audit log, including time spent waiting at approvals.
C. Both, as two figures.
X. Other (please specify)

[Answer]: C

## Q5. [Product] What is "peak rate"?
A. The highest point on the rate diagram, measured the same way the diagram measures it (tokens per minute between points).
B. The busiest single minute, in tokens.
C. The busiest five minutes, in tokens per minute.
X. Other (please specify)

[Answer]: A

## Q6. [Product] Share of cache reads: a share of what?
A. A share of all input tokens (input + cache reads + cache writes): how much of what was sent came from the cache.
B. A share of all tokens, output included.
X. Other (please specify)

[Answer]: A
