# Requirements: US-0604, filter epics and user stories

## Intent analysis

The person looks for the next thing to work on in a long backlog. Today each epic page filters by status and priority only, one epic at a time. They want to filter across every epic too, by more fields, and see how many stories match. Enhancement in the renderer (`src/renderer/FeaturesView.jsx`) over data the parser already gives. Depth: Standard.

## Functional requirements

- **FR1 Filter bar on the Epics tab [Q1].** Filters for status, release, epic, priority, complexity and free text sit above the epic list.
  - **FR1.1** With any filter set, the view shows one list of the matching stories from every epic. Each row names its epic, and choosing a row opens the story on its epic's page.
  - **FR1.2** With no filter set, the epic list shows as today.
- **FR2 Filters on an epic's page [Q1].** The page keeps its status and priority filters and gains release, complexity and free text (no epic filter there).
- **FR3 Combining.** In both places the filters combine (a story must match all of them), the number of matching stories shows, and one "Clear filters" action empties them all.
- **FR4 Filter values.**
  - **FR4.1** Status: Planned, In progress, Done, Released, Deployed. Released means a story whose marker says "Released in vX.Y.Z"; Done means done and not yet released.
  - **FR4.2** Release: every version in the release list (US-0603/US-0605) and "No release". Shown only with the Releases delivery setting.
  - **FR4.3** Epic, priority and complexity: the values found in the feature docs, and nothing else.
  - **FR4.4** Free text: case-insensitive, over the story's title and its text.
- **FR5 Not remembered [Q2].** Filters start empty each time the view opens; nothing is saved.
- **FR6 Translations.** Every new text goes through `t()` in `sv.json` and `en.json`.

## Non-functional requirements

- **NFR1 No new dependency.**
- **NFR2 Accessible.** Each filter has a label, the count is announced politely (`aria-live`), and everything works with the keyboard.
- **NFR3 Responsive.** Filtering this repository's backlog (about 100 stories) updates within one render, with no visible lag.

## Constraints

- One filter function, shared by the bar and the epic page, so they always agree.
- `data-testid` values follow `<component>-<role>`; the existing `features-view-filter-status` and `features-view-filter-priority` stay.

## Assumptions

- [assumption] The story's criterion "The filter is remembered per project" is dropped by the person's answer to Q2; the epic file's criteria are updated to match when the story is delivered.
- [assumption] With the Continuous delivery setting the release filter is hidden, as the rest of the release features are. Reason: US-0603/US-0605.
- [assumption] A story with no priority or complexity matches only when that filter is empty. Reason: an exact-match filter.

## Out of scope

- Saving or sharing filters, and sorting.
- Filters in the Releases tab.

## Open questions

None.

## Sources

- Initial description: US-0604 in `docs/features/epic-06-feature-docs.md` [desc]
- Workflow-selected scope: ultra-express [scope]
- Answers in `requirements-analysis-questions.md` [Q1] [Q2]
- Current code: `src/renderer/FeaturesView.jsx` (`EpicDetail` filters), `src/main/parsers/features.js` (status, priority, complexity)
