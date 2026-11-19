# RAID Log: EPIC-14 Spec Kit

Based on the intent statement (`ideation/intent-capture/intent-statement.md`) and `feasibility-assessment.md`.

## Risks

| ID | Risk | Likelihood | Impact | Response |
|---|---|---|---|---|
| R1 | Seven stories plus two unplanned pieces (token log per feature, the repository setting) do not fit v0.2.11 | High | High | Scope Definition sets a first version against the success measure |
| R2 | Spec Kit changes its file layout; with any version accepted, progress and task views break quietly | Medium | Medium | Every view names what it could not read (C4); a test project per supported release |
| R3 | `specify init` has no dry run, so US-1405's preview cannot show exact file changes | Medium | Low | Preview describes the command and its target; output shown after the run |
| R4 | opencode's Spec Kit command form differs from Claude Code's | Medium | Medium | Check with a test project before US-1403 |
| R5 | The framework file in the repository is changed on one clone and conflicts on another | Low | Medium | One small file, merged like any other; the app reads it on open |

## Assumptions

| ID | Assumption | Check |
|---|---|---|
| A1 | `specify init --integration opencode` exists and works | Run it on a test project |
| A2 | Spec Kit's licence allows use from the app | Read the licence before release |

## Issues

| ID | Issue | Owner |
|---|---|---|
| I1 | US-1401 and US-1406 say the choice is kept in project settings; it must be kept in the repository (Q2) | Scope Definition |
| I2 | No story holds the token log for Spec Kit features (Q3) | Scope Definition |
| I3 | No story says what the waiting-questions popup and agent progress, both read from AI-DLC's audit log, show in a Spec Kit project | Scope Definition |

## Dependencies

| ID | Dependency |
|---|---|
| D1 | US-1405 depends on the AI-DLC setup flow (US-0503) |
| D2 | US-1404 depends on the editor (EPIC-10) |
| D3 | US-1402, US-1403, US-1407 depend on US-1401 |
| D4 | The `specify` CLI on the login shell's `PATH` (installed by the person) |

## Assumptions & Open Questions

- [assumption] A1 and A2 above are not checked in Ideation.
