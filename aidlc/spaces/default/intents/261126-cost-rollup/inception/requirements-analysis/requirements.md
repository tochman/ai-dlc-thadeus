# Requirements — US-1303 Cost per story, epic and release

## Sources

- Initial description: US-1303 story text and acceptance criteria in `docs/features/epic-13-insights.md` [desc]
- Workflow-selected scope: ultra-express [scope]
- This stage's answers: [Q1] A, stories from the initial description, else the requirements title line, a hand link replaces both; [Q2] A, every intent, archived included; [Q3] A, cost on story, epic and release rows plus a detail with split and rework; [Q4] A, "Not linked" list with a story picker in the project cost panel; [Q5] A, "shared with N stories" note; [Q6] A, CSV later
- Current code: `src/main/features.js` (`loadStoryLinks`, `storyIdsIn`), `src/main/parsers/ledger.js` (`summarizeLedger`, `intentCost`: per intent, all machines, US-0209), `src/main/rework.js` (`overviewRework`, US-1301), `src/main/parsers/releases.js` (`releaseOf`, `buildReleases`), `src/renderer/FeaturesView.jsx`, `src/renderer/CostPanel.jsx`

## Intent

Show what a story, an epic and a release cost to build, by rolling each intent's cost up to the stories it delivered.

## Functional requirements

- **FR1 Which stories an intent delivered.** [Q1]
  - FR1.1 The story IDs in the intent's initial description (`project-description.json`).
  - FR1.2 If it names none, the story IDs in the first line of its `inception/requirements-analysis/requirements.md`.
  - FR1.3 A link made by hand (FR5) replaces both.
  - FR1.4 The existing intent links in the story detail (US-0604) are not changed.
- **FR2 Story cost.** A story's figure is the sum, over every intent linked to it (archived ones included [Q2]), of that intent's ledger cost divided by the number of stories the intent is linked to: dollars, tokens (input, output, cache writes, cache reads), and the split by stage, agent and model. An intent with no ledger entry adds nothing and is named in the detail as "no cost recorded".
- **FR3 Epic and release cost.** An epic's figure is the sum of its stories' figures. A release's figure is the sum of the figures of the stories whose marker names it ("for vX.Y.Z" or "Released in vX.Y.Z").
- **FR4 Rework.** Each figure carries its rework (US-1301, `overviewRework`), split the same way as the cost, and shows it as a share of the figure.
- **FR5 Not linked.** The project cost panel lists every intent that links to no story under "Not linked to a story", each with a story picker. A chosen link is kept in `.thadeus/story-links.json` (intent dirName to story IDs) and can be removed again [Q4].
- **FR6 Where.** [Q3]
  - FR6.1 In the Features view, each story row, epic row and release row shows its cost next to its status; nothing when it is 0 with no linked intent.
  - FR6.2 The story, epic and release detail shows total cost and tokens, the rework share, and a fold-out split by stage, agent and model.
  - FR6.3 A story figure that contains a shared intent says "shared with N stories" on the figure, and the detail names that intent [Q5].

## Non-functional requirements

- **NFR1** Read only for `aidlc/` and the feature docs; the only write is `.thadeus/story-links.json`.
- **NFR2** A figure that includes a model with no price says so ("incomplete"), as the cost panel does.
- **NFR3** Every text goes through `t()` with the same keys in `sv.json` and `en.json`, in the LCARS look.
- **NFR4** Reuses the ledger, intent list and rework already loaded for the cost panel; the Features view adds no noticeable delay.
- **NFR5** TDD, with the 80% line-coverage floor kept.

## Constraints

- The ledger keys intents by UUID; an intent without one has no cost (as in the cost panel).
- Rework needs the audit and readings; where an intent has none, its rework counts as 0 and the detail says "rework not known".

## Out of scope

- CSV export (US-0203's deferred export) [Q6], branch and pull request scanning, cost per hour or per point, changing the feature docs.

## Assumptions & Open Questions

None.
