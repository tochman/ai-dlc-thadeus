# Scope Definition Questions: EPIC-14 Spec Kit

Inputs: the intent statement (first version judged on setting up a new project on Spec Kit from the app and starting its first feature; US-1405 raised to High), the feasibility assessment (feasible with conditions; three pieces no story holds) and the constraint register (all seven stories in v0.2.11, C9).

## Q1. [Product owner] Which stories make the minimum first version?

Your success measure needs a project to be detected and given a framework (US-1401, US-1406), Spec Kit set up from the app (US-1405), and a first feature started from the app, which is the `/speckit-specify` command (US-1403).

A. US-1401, US-1405, US-1406 and US-1403: exactly what the success measure needs
B. A plus the features list and progress (US-1402), so the started feature can be seen
C. All seven stories
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q2. [Product owner] What should happen to the three pieces no story holds yet?

Feasibility found them: keeping the framework choice in the repository, a token log per Spec Kit feature, and what the waiting-questions popup and agent progress show in a Spec Kit project (they read AI-DLC's audit log today).

A. Add each as a new story in EPIC-14
B. Write them into the existing stories' acceptance criteria (the repository setting into US-1401, the token log into US-1402, the popup and progress into US-1401)
C. The repository setting into US-1401; the token log and the popup and progress left out of the first version
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. [Developer] In which order should the stories be built?

A. Dependency first: US-1401, then US-1406 and US-1405, then the rest
B. Risk first: a Spec Kit test project and US-1402's file reading first, then the rest
C. Value first: whatever gets the requester to a new Spec Kit project soonest
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q4. [Product owner] If the first version is smaller than seven stories, what happens to the rest?

You set all seven for v0.2.11 earlier (constraint C9). This answer decides whether that still holds.

Not asked: the answer follows from Q1 (the first version is all seven).

A. Still all in v0.2.11; the first version is only the order of work
B. The rest move to the next release after v0.2.11
C. The rest stay in EPIC-14 with no release
D. Not applicable: the first version is all seven
X. Other (please specify)

[Answer]: D

## Q5. [Product owner] Is there a hard date for the first version?

The requester (someone you work with) needs a new Spec Kit project first.

A. No date; it ships with v0.2.11 whenever that is
B. Yes, a date (say which)
C. Not yet defined
D. Not applicable
X. Other (please specify)

[Answer]: D


## Q6. [Product owner] Are the three new stories (Q2) in the first version too?

(Answered before the risks were rejected at Approval & Handoff; kept as answered.)

A. All three in: the first version is ten stories, all in v0.2.11
B. The repository setting only; the token log and the popup and progress come after
C. None of them; they wait for a later release
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q7. [Product owner] Spec Kit becomes v0.3.0 and the stories now planned for v0.3.0 move to v0.3.1 and later. What happens to v0.2.11's two finished fixes, US-0032 and US-0033?

You asked (2026-11-19): "this feature should be 0.3.0 and others should follow AFTER that release. so the next one should be 0.3.1, 0.3.2, etc." Both fixes are merged on `main` and marked "for v0.2.11".

A. Cut v0.2.11 now with just US-0032 and US-0033, before the Spec Kit work
B. No v0.2.11: the two fixes ship in v0.3.0 with Spec Kit
C. Not yet defined
D. Not applicable
X. Other (please specify)

[Answer]: A

## Q8. [Product owner] The any-version risk was rejected at Approval & Handoff. Which Spec Kit versions should the first version support?

A. v1.4.x only; other versions get a clear "not supported" note
B. v1.4.x and newer: tested on v1.4.x, newer versions read with a warning
C. Keep any version
D. Not yet defined
X. Other (please specify)

[Answer]: B
