# Initiative Brief: EPIC-14 Spec Kit

Compiled from the intent statement and stakeholder map (`ideation/intent-capture/intent-statement.md`, `ideation/intent-capture/stakeholder-map.md`), the feasibility assessment and constraint register (`ideation/feasibility/feasibility-assessment.md`, `ideation/feasibility/constraint-register.md`), and the scope document and intent backlog (`ideation/scope-definition/scope-document.md`, `ideation/scope-definition/intent-backlog.md`).

## Intent

Developers with Spec Kit projects cannot use THADEUS: the app opens only projects with `aidlc/spaces/`. Someone the person works with asked for it, first to set up a new project on Spec Kit. The first version is judged on setting up a new project on Spec Kit from the app and starting its first feature there.

## Market validation

Not run: Market Research was skipped for this check. Spec Kit is a known public toolkit; the question was fit with THADEUS, not market.

## Feasibility and risks

Feasible with conditions. The stack already reads and watches project files, runs CLIs with a preview, and sends commands to the agent terminal. Gaps found and now covered by new stories: the framework choice kept in the repository (US-1408), a token log per Spec Kit feature (US-1409), and waiting questions and agent progress in a Spec Kit project (US-1410). Risks accepted as revised: ten stories in one release, now their own release v0.3.0; Spec Kit format changes, now v1.4.x and newer with a warning for newer versions.

## Scope

Ten stories, US-1401 to US-1410, all in v0.3.0, built value first: framework per project (US-1401, US-1408), setup and choice (US-1405, US-1406), commands (US-1403, success measure met), then features and progress (US-1402, US-1410), token log, rules and switching (US-1409, US-1404, US-1407). Out: moving work between frameworks, installing `specify`, both frameworks in one project, other harnesses than Claude Code and opencode. v0.2.11 ships first with US-0032 and US-0033; other planned stories follow in v0.3.1 and v0.3.2.

## Concept visuals and team

Rough Mockups and Team Formation were skipped: the views reuse the LCARS left arm, and one person builds and decides.

## Recommendation

**Go, not yet started.** The plan is solid and EPIC-14 is next after the current work, but it does not start now, and not through one big Inception; how it is built (Inception, or story by story) is decided when it starts.

## Assumptions & Open Questions

- [assumption] `specify init --integration opencode` works; checked on the v1.4.x test project.
- [assumption] Spec Kit's licence allows use from the app; read before the release.
