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

- Små fixar som personen rapporterar under arbetet läggs som storys i EPIC-00 (`docs/features/epic-00-fixes.md`) och görs direkt, utan ett AI-DLC-arbetsflöde: rätta, testa och uppdatera storyn (🚧 vid start, ✅ när den är klar, releasen när den är känd). En fix som växer till en feature flyttas till sitt ämnes epic och går genom AI-DLC. (affirmed 2026-11-14)

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

- ALWAYS hålla feature-dokumenten aktuella när projektet har `docs/FEATURES.md` och epic-filer under `docs/features/`. I Deployment Execution för varje intent, och före PR:en, uppdateras fyra saker: storyns statusmarkör, uppfyllda acceptanskriterier (`- [x]`), epicens rad `**Status (…)**` och raden i `FEATURES.md`. När en release taggas märks varje story som ingår med "Released in vX.Y.Z". En ny story som användaren beskriver läggs in direkt. En levererad story får aldrig stå som pågående. (affirmed 2026-11-13)

ALWAYS write a failing test before the code for new behaviour (TDD). (affirmed 2026-11-14)

ALWAYS keep line coverage at or above 80%, checked in CI. (affirmed 2026-11-14)

ALWAYS run ESLint and Prettier in CI; a failure blocks the merge. (affirmed 2026-11-14)

ALWAYS merge each story through its own squash-merged pull request; only docs and small chores may go straight to `main`. (affirmed 2026-11-14)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
- ALWAYS keep every stage document short, about a page or two, with detail only where a later stage needs it; later stages reread it many times, so length multiplies the cost. (learned 2026-11-14) <!-- cid:261114-agent-dialogs:code-generation:ef58fefd3c434e0b7b8aab3ad38ffbf544ad8c53fe32f732c33929c7981ac673 -->
- ALWAYS follow the story lifecycle in the feature docs: a new story the person describes goes into the right epic file right away; when work on a story starts, set it to 🚧 In progress in its status marker, the epic's **Status (…)** line and its FEATURES.md row; when it is built and approved, set it to ✅ Done and tick its met acceptance criteria; as soon as the release it goes into is known, write it out ("for vX.Y.Z", and "Released in vX.Y.Z" when the tag is cut); a delivered story never stays in progress. (story-lifecycle: releases v1) (learned 2026-11-15) <!-- cid:261115-release-handling:build-and-test:3190acfcd2bc0730aee3349a9294a92a9146937d811a80b23d293253455254b4 -->
