# User Stories Plan and Questions: EPIC-14 Spec Kit

## Plan

- **Personas:** two, drawn from the epic: the developer who opens and drives a project in THADEUS (primary), and the same developer working from a second clone (US-1408).
- **Format:** "As a [persona], I want [goal], so that [benefit]", following INVEST. Acceptance criteria are Given/When/Then, each with a stable `AC` ID.
- **Priority:** MoSCoW, taken from the scope document: Must for US-1401, US-1405, US-1406, US-1403 and US-1408; Should for the rest.
- **Breakdown:** one story per epic story (US-1401 to US-1410), grouped in the value-first order of the scope document. Each keeps its epic number so the feature docs stay in step.

## Q1: How should the stories be cut?

A. One story per epic story (ten), each keeping its US-14xx number, with the requirements' FR IDs as its acceptance criteria
B. Split the larger epic stories (US-1401, US-1402, US-1403) into smaller ones, with new numbers added to the epic
X. Other (please specify)

[Answer]: A

## Q2: Should the stories settle the two major review points from Requirements Analysis?

These are R-01 (US-1410: what exactly is shown) and R-02 (a project with both frameworks and no readable `.thadeus/project.json`).

A. Yes: US-1410 shows a waiting dialog's question and agent from the hooks, and the active feature with its done/total tasks, or "nothing to show yet, no agent hooks or active feature"; with both frameworks and no readable file, the app always asks (US-1406) and never guesses
B. No: leave them as accepted risks for Functional Design
X. Other (please specify)

[Answer]: A
