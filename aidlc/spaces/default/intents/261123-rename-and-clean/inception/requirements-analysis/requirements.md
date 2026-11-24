# Requirements: rename an intent (US-0508) and a cleaning pass (US-0043)

## Intent analysis

Close v0.2.15 with its last two stories [desc]. US-0508 lets a person give an intent a name that says what it is, without touching AI-DLC's files. US-0043 clears all 30 ESLint warnings by fixing their causes, so new warnings stand out. Each story has its own branch and squash-merged pull request: `feat/US-0508` first, `fix/US-0043` after it merges [desc].

## Functional requirements

### FR1 Display name for an intent (US-0508)

- **FR1.1** AI-DLC 2.11.3 has no rename command, so the app keeps a display name beside the slug in its own committed file (`.thadeus/intent-names.json`, keyed by the intent's folder name). The intent's folder, slug and `intents.json` never change [Q1].
- **FR1.2** The intents list and the intent's detail let a person set the name [Q4].
- **FR1.3** A name follows slug rules: lowercase letters, digits and hyphens only (no spaces or path characters), 1 to 60 characters, and unique in the space among the other intents' slugs and display names. An invalid name is refused with a reason shown next to the field, and nothing is saved [Q2].
- **FR1.4** Clearing the field (an empty name) removes the display name, and the folder name shows again [Q5].
- **FR1.5** A rename is allowed at any time, also while the intent's work is running [Q3].
- **FR1.6** Wherever the app shows an intent's name today, it shows the display name when one is set: the list, the detail, the pipeline, the agent dialog, the cost history and story links. Lookups keep using the folder name, so nothing points at a missing intent [Q4].
- **FR1.7** The name follows the file live, so a change made on another clone and pulled in shows up without a restart [assumption: same file-watching as the other `.thadeus` files].
- **FR1.8** Every text goes through `t()` with the same keys in `sv.json` and `en.json`. The UI follows LCARS, and new controls carry `data-testid`s [memory].

### FR2 Cleaning pass (US-0043)

- **FR2.1** The `/simplify` skill is run over the files the warnings point at, and its fixes are kept where behaviour stays the same [desc].
- **FR2.2** Each of the 30 warnings is fixed for its cause: a stable callback or ref, a dependency added where the effect must rerun, an effect split or moved into a handler, or a value pulled out of a complex dependency expression. No rule is switched off; an `eslint-disable` line is used only with a comment that says why.
- **FR2.3** `npx eslint .` reports 0 errors and 0 warnings, and both CI and `npm run lint` run with `--max-warnings 0` [Q6].
- **FR2.4** Where a warning hid a real bug (a stale value, a missed rerun), a test that fails first proves it.

## Non-functional requirements

- **NFR1** TDD: a failing test comes before each new behaviour. Line coverage stays at or above 80%, and the full suite, Prettier and the built-app end-to-end tests stay green [memory].
- **NFR2** No behaviour change from US-0043 other than the bugs FR2.4 proves.
- **NFR3** A broken or missing `intent-names.json` never breaks the app: an unreadable file is logged and treated as empty, so folder names show.

## Constraints

- The app never edits AI-DLC's own files (folder names, `intents.json`, state, audit) [desc].
- US-0043 is built after US-0508 merges, so it cleans US-0508's code too and does not clash with it [desc].

## Assumptions

- The display-name file lives in `.thadeus/` and is committed, so every clone shows the same names [assumption: the same as the token logs].

## Out of scope

- A real rename of the intent's folder or slug, and asking AI-DLC upstream for a rename command [Q1].
- Blocking a rename while work runs (dropped from the story's criteria) [Q3].

## Open questions

None.
