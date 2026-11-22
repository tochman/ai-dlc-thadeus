# Units Generation Questions: EPIC-14 Spec Kit

Settled by the team practices, and not asked again:
- one short-lived branch and one squash-merged pull request per story;
- a single desktop app, deployed as one package;
- integration in one process tree: main process, preload IPC, renderer.

## Q1: How should the work be cut into Units?

A. One Unit per story (ten Units, U1–U10). Each Unit is one branch and one pull request, matching the team practice.
B. One Unit per value-first group (five Units). Each Unit holds two or three stories but still ships one pull request per story.
X. Other (please specify)

[Answer]: A

## Q2: May Units with no dependency between them be built at the same time?

A. Yes, allow parallel building where the dependency graph permits it. Delivery Planning still picks the order.
B. No, build strictly one after another, story by story, as the team practice says.
X. Other (please specify)

[Answer]: A
