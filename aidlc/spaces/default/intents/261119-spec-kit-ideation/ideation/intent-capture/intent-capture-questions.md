# Intent Capture Questions: EPIC-14 Spec Kit

## Sources

- [desc] Initial description: "Validate EPIC-14 Spec Kit (docs/features/epic-14-spec-kit.md, US-1401 to US-1407) as unvalidated raw input, Ideation phase only: Intent Capture, Feasibility and Constraints, Scope Definition, Approval and Handoff. Skip Market Research, Team Formation and Rough Mockups unless a critical gap needs them. Extract the underlying problem statement, check technical and architectural feasibility against the current codebase and stack, find missing requirements or conflicts, and sort the stories into MVP and out of scope. Stop at the Ideation to Inception verification gate; do not go into Inception or Construction."
- [scope] Workflow-selected scope: `bugfix`.

## Q1. [Product owner] What problem does Spec Kit support solve?

EPIC-14 says what to build (Spec Kit views, commands, setup, switching) but not the pain behind it. The problem statement is built from this answer.

A. Developers who already use Spec Kit cannot use THADEUS at all, because a project is only accepted with `aidlc/spaces/`
B. I want to compare AI-DLC and Spec Kit myself, on real projects, in the same app
C. THADEUS should not depend on one framework; supporting a second proves the shell is framework-neutral
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. [Product owner] Who is the first user of Spec Kit support? (select all that apply)

A. Me, on my own projects
B. Other THADEUS users who already run Spec Kit projects
C. Teams choosing between AI-DLC and Spec Kit
D. Not yet defined
X. Other (please specify)

[Answer]: A, B, C

## Q3. [Product owner] What would show that the first version worked?

The answer becomes the success metrics, so it needs something you could check.

A. I can open an existing Spec Kit project and see its features and tasks correctly, without opening the files by hand
B. I can take one Spec Kit feature from spec to implemented, driving every step from the app
C. I can set up a new project on Spec Kit from the app and start its first feature
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q4. [Product owner] Why now?

The epic was asked for on 2026-11-19, after a look at Spec Kit v1.4.2, and is planned for v0.2.11.

A. Spec Kit has just matured enough (v1.4.2) to be worth supporting
B. A user or team asked for it
C. It has to be in v0.2.11 for a reason outside the app (a demo, a talk, a customer)
D. No outside trigger: it is the next idea in line
X. Other (please specify)

[Answer]: B

## Q5. [Product owner] Who decides what goes into the first version, and who else has a say?

A. Only me: I decide and nobody else needs to be consulted
B. Me, with input from users or a team I name
C. Not identified
D. Not applicable
X. Other (please specify)

[Answer]: A

## Q6. [Product owner] Does anyone need to be told how this check goes, and how?

A. No: the approval gates in this workflow are enough
B. Yes: a note or post when the check is done (say where)
C. Not yet defined
D. Not applicable
X. Other (please specify)

[Answer]: A

## Q7. [Product owner] What should the first version of Spec Kit support leave out? (select all that apply)

The epic already rules out moving work from one framework's format into the other's (US-1407 notes).

A. Switching a project between frameworks (US-1407)
B. Setting up Spec Kit from the app (US-1405); only projects that already have `.specify/`
C. Running Spec Kit commands from the app (US-1403); view only
D. None: everything in US-1401 to US-1407 may be in the first version
X. Other (please specify)

[Answer]: D

## Assumption Confirmation

These assumptions are kept in the intent statement and stakeholder map, labelled `[assumption]`:

1. Who asked for Spec Kit support, and what they need first, is not named; Scope Definition may need it to rank the stories.
2. The success measure (set up a new project and start a feature) leans on US-1405 and US-1406, while the epic marks US-1405 as Medium priority; Scope Definition settles the order.
3. The interest of the user or team who asked for Spec Kit support is not known.

A. Accept assumptions
B. Convert to follow-up questions

[Answer]: B. Convert to follow-up questions

## Q8. [Product owner] Who asked for Spec Kit support?

This was assumption 1 and 3. Knowing who asked tells Scope Definition whose needs come first.

A. A THADEUS user who already runs Spec Kit projects
B. A team deciding between AI-DLC and Spec Kit
C. Someone I work with, on a project of ours
D. Not identified
X. Other (please specify)

[Answer]: C

## Q9. [Product owner] What do they need first?

A. To open their existing Spec Kit project in THADEUS and see where its features stand (US-1401, US-1402)
B. To set up a new project on Spec Kit from the app (US-1405, US-1406)
C. To drive the Spec Kit commands from the app (US-1403)
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q10. [Product owner] Your success measure is setting up a new project on Spec Kit and starting its first feature, but EPIC-14 marks that setup story (US-1405) Medium priority. Which should change?

This was assumption 2.

A. Raise US-1405 to High: setup is part of the first version
B. Keep US-1405 at Medium and change the success measure to opening an existing Spec Kit project
C. Keep both; Scope Definition settles the order
D. Not yet defined
X. Other (please specify)

[Answer]: A
