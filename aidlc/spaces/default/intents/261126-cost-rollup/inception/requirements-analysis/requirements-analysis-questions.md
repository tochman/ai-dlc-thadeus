# Requirements Analysis Questions — US-1303 Cost per story, epic and release

What the code has today: the Features view already links stories to intents (`loadStoryLinks` in `src/main/features.js`), from every story ID in the intent's initial description and its `requirements.md`. The ledger gives each intent's cost, summed over machines (US-0209). A story's release comes from its "for vX.Y.Z" / "Released in vX.Y.Z" marker (`releaseOf`).

Of the 77 intents: 46 name one story in their initial description, 22 name several, 7 name none. `requirements.md` names more, since it cites the stories a change depends on (US-1302's names 8).

## Q1. [Product owner] Which stories does an intent's cost go to?
The current link list counts every story the requirements mention, dependencies included, so it would spread cost onto stories that were not built.

A. The stories named in the intent's initial description; if it names none, the story in the title line of its `requirements.md`; a link made by hand (Q4) replaces both
B. Every story the current link list shows (description and requirements)
C. As A, and also the `feat/<story>` / `fix/<story>` branch and the pull request title from git
X. Other (please specify)

[Answer]: A

## Q2. [Product owner] Which intents count?
69 intents are archived; most finished stories were built in them.

A. Every intent in the ledger, archived ones included
B. Only intents that are not archived
X. Other (please specify)

[Answer]: A

## Q3. [Product owner] Where do the figures appear?

A. Cost next to the status on each story row, epic row and release row in the Features view; the story, epic and release detail shows total cost and tokens, a fold-out split by stage, agent and model, and the rework in it
B. As A, but the split only in the release detail
C. A new "Cost by feature" section in the project cost panel instead
X. Other (please specify)

[Answer]: A

## Q4. [Product owner] How is an intent that names no story linked?

A. A "Not linked to a story" list in the project cost panel, each intent with a story picker; the link is kept in `.thadeus/story-links.json` and can be removed again
B. As A, but the picker is in the intent's cost tab
X. Other (please specify)

[Answer]: A

## Q5. [Product owner] The even split for an intent with several stories: what does the view show?

A. A note "shared with N stories" on the story's figure, with the intent named in the detail
B. No note on the row; only in the detail
X. Other (please specify)

[Answer]: A

## Q6. [Product owner] The CSV export deferred from US-0203: in this story or later?

A. Later; this story shows the figures only
B. Now: one CSV of story, epic and release costs from the Features view
X. Other (please specify)

[Answer]: A
