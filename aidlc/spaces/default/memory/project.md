# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

- Every rule in this project's memory files is written in plain English. (affirmed 2026-11-18 at the person's request)
- Small fixes the person reports during the work become stories in EPIC-00 (`docs/features/epic-00-fixes.md`). A fix that changes code runs as an AI-DLC workflow on the `quick-fix` plan (Code Generation and Build and Test only): test first, fix, and update the story (🚧 when it starts, ✅ when it is done, the release once it is known). A fix that only touches documentation is made directly, without a workflow. A fix that grows into a feature moves to its topic's epic and goes through AI-DLC with a larger plan. (affirmed 2026-11-14, changed 2026-11-16 at the person's request)
- When two stories are in progress at the same time from the same `main`, merge `main` into the later branch and rerun the whole suite (tests, ESLint, Prettier) before its Build and Test is approved: a "done" from a branch holds only against its own base. If a merge still shows conflicts or failures after a story was said to be done, document it in the intent that was current: a section "After merge with main" in `construction/build-and-test/test-results.md` with what was wrong, the cause, the fix (with its commit), the new results and the lesson, plus a `Recovery:` note in the audit log. (affirmed 2026-11-16 at the person's request, after the clash between US-0209 and US-0414)
- When an intent finishes, everything it produced is merged into `main`, so nothing it touched is left uncommitted: the code, the tests, the feature docs, the intent's whole record under `aidlc/spaces/<space>/intents/<intent>/` (state and audit written after the last stage included), `intents.json`, the code knowledge base, the app's token log `.thadeus/tokens/<intent>.json`, every other file under `.thadeus/`, and the app's hook entries in `.claude/settings.json` (so the app and the coding tool work together on every clone). Before the last merge, `git status` must show none of these. Commit them on the story's branch before its pull request merges, or, for what keeps changing after the merge (such as the token log), as one `chore(<story>): close the intent record` commit straight to `main`. Any other uncommitted file is named to the person, who decides whether it goes in its own commit or stays out. (affirmed 2026-11-18 at the person's request, after US-0030 left its token log uncommitted)

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

## Guard Policy

<!-- Project-specific. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

None. (affirmed 2026-11-14)

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

- ALWAYS keep the feature docs current when the project has `docs/FEATURES.md` and epic files under `docs/features/`. In Deployment Execution for every intent, and before the pull request, update four things: the story's status marker, the met acceptance criteria (`- [x]`), the epic's `**Status (…)**` line and the row in `FEATURES.md`. When a release is tagged, mark every story in it "Released in vX.Y.Z". A new story the person describes is added right away. A delivered story never stays in progress. (affirmed 2026-11-13)

ALWAYS write a failing test before the code for new behaviour (TDD). (affirmed 2026-11-14)

ALWAYS keep line coverage at or above 80%, checked in CI. (affirmed 2026-11-14)

ALWAYS run ESLint and Prettier in CI; a failure blocks the merge. (affirmed 2026-11-14)

ALWAYS merge each story through its own squash-merged pull request; only docs and small chores may go straight to `main`. (affirmed 2026-11-14)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
- ALWAYS keep every stage document short, about a page or two, with detail only where a later stage needs it; later stages reread it many times, so length multiplies the cost. (learned 2026-11-14) <!-- cid:261114-agent-dialogs:code-generation:ef58fefd3c434e0b7b8aab3ad38ffbf544ad8c53fe32f732c33929c7981ac673 -->
- ALWAYS follow the story lifecycle in the feature docs: a new story the person describes goes into the right epic file right away; when work on a story starts, set it to 🚧 In progress in its status marker, the epic's **Status (…)** line and its FEATURES.md row; when it is built and approved, set it to ✅ Done and tick its met acceptance criteria; as soon as the release it goes into is known, write it out ("for vX.Y.Z", and "Released in vX.Y.Z" when the tag is cut); a delivered story never stays in progress. (story-lifecycle: releases v1) (learned 2026-11-15) <!-- cid:261115-release-handling:build-and-test:3190acfcd2bc0730aee3349a9294a92a9146937d811a80b23d293253455254b4 -->
- ALWAYS follow the LCARS interface in all of the app's UI, including new views and concepts for new features. (learned 2026-11-16) <!-- cid:261116-team-collab-concept:scope-definition:d6b6433e3a19c44b80c7155eaf1e85b53df84bffa6c3a9ba1e3315c14417ef73 -->
