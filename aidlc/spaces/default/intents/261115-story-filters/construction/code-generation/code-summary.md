# Code Summary: US-0604, filter epics and user stories

## What was built

- `src/renderer/storyFilter.js` (new, pure): `STATES`, `NO_RELEASE` (`'-'`), `EMPTY_FILTERS`, `storyState`, `storyRows`, `filterOptions(epics, tags, plans)`, `isActive`, `matches`. The Epics tab and the epic page both filter through `matches`, so they always agree.
- `src/renderer/FeaturesView.jsx`: a `StoryFilters` component (labelled selects for state, release, epic, priority, complexity, a search input, a polite count, Clear filters). On the Epics tab it sits above the epic list, and while a filter is set a match list (`features-view-matches`, rows `features-view-match`) replaces the epic list; a row opens the story on its epic's page through `openStory`. `EpicDetail` uses the same component without the epic field. Filter state is `useState` only (FR5).
- `src/shared/locales/{sv,en}.json`: `features.status.released` and `features.filter.*`.

## Decisions

- Test ids are `<prefix>-<field>`: the epic page keeps `features-view-filter-status`, `-priority` and adds `-release`, `-complexity`, `-text`, `-count`, `-clear` in `features-view-filters`; the Epics tab uses `features-view-all-filter-*` in `features-view-all-filters`, so the existing ids stay unique.
- `filterOptions` takes `(epics, tags, plans)` instead of `(rows, tags)`, because `buildReleases` needs the epics and the plan files to list every release (FR4.2).
- The epic page's priority and complexity options come from that epic; its release options are the whole release list.
- The status badge in rows still shows the parser status (a released story reads ✅ Done); only the filter knows `released`.

## Tests

- `tests/main/storyFilter.test.js`: 7 unit tests.
- `tests/renderer/FeaturesView.test.jsx`: 6 new view tests over two parsed epics (EPIC-06 and a new EPIC-07 fixture); the 13 existing ones are unchanged and pass.
