# Functional Design Questions: U10 u10-speckit-agent-status (US5.2 / US-1410)

What the code shows today: the waiting-questions popup (`AgentDialog`) already shows hook events in any project, a Spec Kit one included. Agent progress is shown only inside an AI-DLC intent's token detail (`agents:progress(projectId, dirName)`), which needs an AI-DLC space and throws without one. A Spec Kit project has no place that shows progress.

## Q1. [Product] Where should a Spec Kit project show the agent's progress (the active feature's name and its done/total tasks, AC5.2.2)?

A. At the top of the Specs view, above the features list, as one LCARS readout row for the active feature (Recommended: it is where the person already looks at features)
B. In the left arm's Spec Kit block, as the live strip and figure the AI-DLC block shows while an agent works
C. In Configuration › Agent, beside the hook settings
X. Other (please specify)

[Answer]: A

## Q2. [Product] The story says that with no hook event and no active feature, "both say nothing to show yet". The popup only opens when a question arrives. Where should the "nothing to show yet" text appear for the questions side?

A. Only in the progress readout from Q1, which says it for both questions and progress in one line (Recommended: the popup stays as it is and never opens empty)
B. Also in the popup: the popup can be opened by hand and shows the text when nothing waits
X. Other (please specify)

[Answer]: A
