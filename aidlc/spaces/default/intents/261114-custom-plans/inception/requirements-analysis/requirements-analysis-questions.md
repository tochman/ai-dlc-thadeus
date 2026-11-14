# Requirements Analysis Questions

The request was "continue". The previous piece of work (v0.2.3) is finished, and the next planned story is US-0903 "Create and reuse custom plans" (`docs/features/epic-09-aidlc-configuration.md`). These questions confirm that and settle what the story leaves open.

## Q1. [Product owner] Which work is this?

"continue" names no story. The next planned one is US-0903 (see a list of saved plans, compose a new one, save the running plan, start work on a plan, edit or delete a saved plan).

A. US-0903 as written in the epic file
B. US-0903 plus a related story (please name it)
C. A different story (please name it)
X. Other (please specify)

[Answer]: X. Other: "we will plan the 0.2.4 release. I will tell you what I want in chat" **Mode:** chat

## Q2. [Product owner] Where should the list of plans live in the app?

The configuration view from US-0901/US-0902 (`ConfigView.jsx`) already shows the project's AI-DLC settings. The plans list can join it or get its own place.

A. A new "Plans" section inside the existing configuration view
B. Its own view, reached from the left arm like Features and Cost
C. A tab inside the configuration view (Settings / Plans)
X. Other (please specify)

[Answer]: B. Own view

## Q3. [Developer] How much of the story should this work build?

The story has two direct file edits (tier 2): editing a saved plan's description, depth or keywords, and deleting a saved plan. Both rewrite files in `aidlc/scopes/` and the harness copy, then recompile. The rest only reads files, runs `aidlc engine scope save`, or types into the agent tab.

A. Everything in the story, including the tier-2 edit and delete
B. Everything except edit and delete; move those to a follow-up story
C. Only the list and the read-only stage view for now
X. Other (please specify)

[Answer]: A. "us-0903 as asked before" **Mode:** chat

## Q4. [Release manager] How should it ship?

Recent stories went out as push, PR, and merge once CI is green, with no tag. US-0903 is listed as "planned for v0.2.4".

A. Push, PR, merge once CI is green, no tag (the release comes later)
B. Release v0.2.4 now: PR, merge, tag
X. Other (please specify)

[Answer]: X. "releas at end of work. create a plan as we did with previous release but commit along the way in separate PR's per story" **Mode:** chat

## Chat notes so far (2026-11-14)

The person named for v0.2.4 (messages 8984314c, 402efa35):
- US-0903 custom plans, "as asked before".
- US-0004 (popup answers reach the agent) is NOT working: "We can not update AIDLC answers or Claude answers." Investigate.
- US-0408 About popup: a new design from two reference screenshots (`~/Desktop/Screenshot 2026-11-14 at 08.57.27.png`, `08.57.52.png`).
- A new story: token consumption visualization.
- "us-0205" and "US-2001", see Q5 and Q6.

## Q5. [Product owner] What should v0.2.4 do with US-0205?

US-0205 "Live cost while a workflow runs" was released in v0.2.0 with all criteria ticked.

A. It is broken too: the live cost does not update; investigate it with US-0004
B. Extend it (please say how)
C. It was a slip; leave it out
X. Other (please specify)

[Answer]: C. "forget US-0205 My mistake" **Mode:** chat

## Q6. [Product owner] Which story is "US-2001"?

No US-2001 exists. The nearest is US-1001 "Edit files in the app with Monaco" (EPIC-10).

A. US-1001, Monaco editing
B. A new story (please describe it)
X. Other (please specify)

[Answer]: A. "us-1001 of course" **Mode:** chat

## Q7. [Product owner] What should the token consumption visualization show?

The first screenshot has glowing bar meters, a level scale and a waveform. Cost data today comes from `usage-ledger.json` per intent, stage, agent and model.

A. Live token flow for the running work: input, output and cache tokens as meters, with a rate waveform over time
B. Tokens per agent and model as bar meters, for the selected intent
C. Both: a live panel and a per-agent/model breakdown
X. Other (please specify)

[Answer]: A. "live token view" **Mode:** chat
