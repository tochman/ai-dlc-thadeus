# Requirements Analysis: questions

Two stories: US-0508 (rename an intent) and US-0043 (cleaning pass). AI-DLC 2.11.3 has no rename command (`intent switch`, `archive` and `unarchive` only; `intent rename` is refused), and the intent's folder name and `intents.json` are AI-DLC's own files. `npx eslint .` reports 30 warnings, 0 errors today.

## Q1. [Product] How should a rename work, given AI-DLC has no rename command?

The story says the app never edits AI-DLC's own files, so the folder `261123-rename-and-clean` cannot change.

A. The app keeps a display name beside the slug in its own folder (for example `.thadeus/intent-names.json`, committed), and shows that name everywhere; the folder and slug stay as they are
B. As A, and also suggest an AI-DLC rename command upstream, to switch over when one exists
C. Wait: park US-0508 until AI-DLC offers a rename
X. Other (please specify)

[Answer]: A

## Q2. [Product] What may a display name look like?

The story says "checked like a slug". With a display name that is only shown, a readable name would also work.

A. Free text, like a title ("Rename and clean"): 1 to 60 characters, trimmed, unique in the space
B. Slug rules as the story says: lowercase, digits and hyphens, no spaces or path characters, unique in the space
X. Other (please specify)

[Answer]: B

## Q3. [Product] Should an intent whose work is running still be blocked from a rename?

With a display name nothing on disk that AI-DLC uses moves, so a rename cannot break running work.

A. Allow it at any time; drop that criterion from the story
B. Keep the block: a running intent cannot be renamed, and the app says why
X. Other (please specify)

[Answer]: A

## Q4. [Product] Where does the new name show?

(select all that apply)

A. The intents list and the intent's detail
B. The pipeline and the agent dialog's project/intent line
C. The cost history (token view) and story links in the features view
D. Everywhere the app shows an intent's name today
X. Other (please specify)

[Answer]: A, B, C, D

## Q5. [Product] How does a person go back to the original name?

A. Clearing the name field (empty) removes the display name, and the folder name shows again
B. A separate "Reset name" button
X. Other (please specify)

[Answer]: A

## Q6. [Developer] For US-0043, how strict should CI be about lint warnings afterwards?

The story says CI fails on warnings (`--max-warnings 0`) once all 30 are fixed.

A. `--max-warnings 0` in CI and in the `npm run lint` script, as the story says
B. Only in CI; the local script stays as it is
X. Other (please specify)

[Answer]: A
