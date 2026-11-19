# Scope Document: EPIC-14 Spec Kit

Builds on the intent statement (`ideation/intent-capture/intent-statement.md`), the feasibility assessment (`ideation/feasibility/feasibility-assessment.md`) and the constraint register (`ideation/feasibility/constraint-register.md`). Answers: `scope-definition-questions.md` (Q1–Q8). Revised 2026-11-19 after Approval & Handoff, where the person rejected both main risks and moved the release.

## Problem and measure

Developers with Spec Kit projects cannot use THADEUS. The first version is judged on one thing: setting up a new project on Spec Kit from the app and starting its first feature there.

## In scope: the first version (MVP), all in v0.3.0

| Story | What | MoSCoW |
|---|---|---|
| US-1401 | One framework per project, and views that follow it | Must |
| US-1405 | Set up Spec Kit in a project (raised to High) | Must |
| US-1406 | See what is installed, and choose the framework | Must |
| US-1403 | Run Spec Kit commands from the app | Must |
| US-1408 (new) | Keep the project's framework in the repository | Must |
| US-1402 | Spec Kit features: the list and where each stands | Should |
| US-1404 | Constitution and extensions | Should |
| US-1407 | Switch a project from one framework to the other | Should |
| US-1409 (new) | A token log per Spec Kit feature | Should |
| US-1410 (new) | Waiting questions and agent progress in a Spec Kit project | Should |

All ten are in the first version (Q1, Q6). "Must" is what the success measure needs; "Should" is the rest of the first version, built after the Musts.

## Out of scope

- Moving work from one framework's format into the other's (US-1407 notes).
- Installing `specify` for the person (US-1405).
- Running both frameworks in one project (decided 2026-11-19).
- Harnesses other than Claude Code and opencode (constraint C3).

## Changes to the stories

- US-1401 and US-1406: "kept in the project settings" becomes "kept in the repository" (US-1408).
- US-1401: the token log line moves to US-1409; the waiting questions and agent progress move to US-1410.
- US-1405: priority High.

## Order of work: value first (Q3)

1. US-1401, US-1408: a Spec Kit project opens and its framework is known on every clone.
2. US-1405, US-1406: set up and choose: the requester can start a Spec Kit project.
3. US-1403: start the first feature from the app (success measure met).
4. US-1402, US-1410: see the feature and what the agent waits on.
5. US-1409, US-1404, US-1407.

A Spec Kit test project (`specify init`) is made before step 4, as EPIC-14's note on US-1402 asks.

## Release and timeline

- Spec Kit is its own minor release, **v0.3.0**: a larger addition, not yet 1.0. v0.2.11 is cut first with the two finished fixes, US-0032 and US-0033 (Q7). Stories planned for v0.3.0 before, and EPIC-13 from v1.0.0, move to v0.3.1; later releases follow as v0.3.2 and on. This answers the ten-stories-in-one-release risk (feasibility R1): the release holds nothing else.
- No hard date (Q5).

## Spec Kit versions

v1.4.x and newer (Q8): tested on v1.4.x; a newer version is read with a warning that names the version, and every view names what it could not read. This replaces "any version" (constraint C4) and answers the quiet-breakage risk (feasibility R2).

## Assumptions & Open Questions

- [assumption] `specify init --integration opencode` works; checked on the v1.4.x test project.
- [assumption] Spec Kit's licence allows use from the app; read before the release.
