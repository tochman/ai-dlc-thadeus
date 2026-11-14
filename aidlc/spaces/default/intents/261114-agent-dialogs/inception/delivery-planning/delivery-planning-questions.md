# Delivery Planning questions: US-0506 agent dialogs

Background: Units Generation fixed five Units in a chain (`unit-of-work-dependency.md`): u1-questions first; u2-permissions and u3-replies after it; u4-install after u1–u3; u5-notifications after u2 and u3. A **Bolt** here is one build pass over one Unit, ending in something that runs and is checked. Already settled: no walking skeleton (team practices), US-0506 ships as one pull request (User Stories Q1), and the work is done by the AI developer with you approving each checkpoint (no team formation in this plan). Today the work is set to build one Unit at a time.

## Q1. [Delivery] After u1-questions, which comes next?

A. u3-replies first: a question asked in plain chat text is the gap the old popup could never cover, and the latest-message line is visible every day
B. u2-permissions first: permission prompts block the agent until someone answers
C. Whichever; follow the Unit order (u2, then u3)
X. Other (please specify)

[Answer]: C
**Mode:** guided

## Q2. [Delivery] Should Units with no dependency between them be built at the same time?

u2 and u3 could be built side by side, and so could u4 and u5, each in its own copy of the project. Both pairs edit the same files, so the second to finish must merge carefully.

A. No, one Unit at a time: simpler, no merges between Units, slower
B. Yes, side by side where the graph allows: faster, with a merge step after each pair
X. Other (please specify)

[Answer]: B
**Mode:** guided

## Q3. [Product] Which release should take US-0506?

A. The next patch, v0.2.5, with all five Units
B. A later release (v0.3.0), since this replaces the question pipeline
C. Decide when the work is done
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q4. [Delivery] What if the spike in u1 shows Claude Code's hooks cannot return a question's answer, only allow or deny it?

The contracts already describe that case: questions are then answered by pressing the agent's own keys after it shows its picker (`contract-summary.md`, C1 provisional block).

A. Carry on with the keys path for questions; permissions and replies are not affected
B. Stop after the spike and come back to you before building the rest of u1
X. Other (please specify)

[Answer]: A
**Mode:** guided
