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

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

- ALWAYS hålla feature-dokumenten aktuella när projektet har `docs/FEATURES.md` och epic-filer under `docs/features/`. I Deployment Execution för varje intent, och före PR:en, uppdateras fyra saker: storyns statusmarkör, uppfyllda acceptanskriterier (`- [x]`), epicens rad `**Status (…)**` och raden i `FEATURES.md`. När en release taggas märks varje story som ingår med "Released in vX.Y.Z". En ny story som användaren beskriver läggs in direkt. En levererad story får aldrig stå som pågående. (affirmed 2026-11-13)
- ALWAYS följa storyns livscykel i feature- och epic-filerna medan arbetet pågår, inte bara i slutet: när arbetet på en story startar sätts den till 🚧 Pågående (storyns markör, epicens rad `**Status (…)**` och raden i `FEATURES.md`); när den är färdigbyggd och godkänd sätts den till ✅ Klar; när det är känt vilken release den ska ingå i skrivs releasen ut ("for vX.Y.Z", och "Released in vX.Y.Z" när taggen sätts). (affirmed 2026-11-14)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
