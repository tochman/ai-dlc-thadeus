# Requirements Analysis Questions: US-0701 i18n foundation and English

The story's acceptance criteria in `docs/features/epic-07-internationalisation.md` already settle most of this work. These questions cover only what they leave open.

## Q1. [Product owner] Prompts the app types into the Claude terminal

The app sends some ready-made requests to Claude, for example the "set up feature docs" request in `src/renderer/featureDocsPrompt.js`, which is written in Swedish today. These are text for Claude, not interface text a person reads in a view. Should they follow the chosen language?

A. Yes: they are looked up by key like the rest and follow the chosen language
B. No: keep them as they are (Swedish) and leave them out of the translation files
C. Keep them in one fixed language, English, whatever the interface language is
X. Other (please specify)

[Answer]: A (Follow the chosen language) **Mode:** guided

## Q2. [Product owner] Who writes the English text

All of today's Swedish texts need an English version in `en.json`.

A. I write the English text and you review it in the pull request
B. I write it, and you send me terms or a glossary to use first
X. Other (please specify)

[Answer]: X (Other: "you create the en.json with phrases translated by you") **Mode:** guided

## Q3. [Developer] Plural forms in the translation files

The story allows either ICU-style plurals (`{n, plural, one {# händelse} other {# händelser}}`) or a simple pair per key (`"events": { "one": "{n} händelse", "other": "{n} händelser" }`). This choice also decides what US-0702 translators will write.

A. Simple `one`/`other` pair per key, chosen with `Intl.PluralRules` (easier to write and check)
B. ICU-style `{n, plural, …}` inside the string (one string per key, more expressive)
X. Other (please specify)

[Answer]: B (ICU plural) **Mode:** guided

## Q4. [Developer] Translation library

The app has no i18n library today. Lookup, `{placeholder}` interpolation, plurals and the fallback chain can be written as one small module, with `Intl` doing number, money and date formatting.

A. A small module of our own, with no new dependency
B. An established library (for example i18next with react-i18next)
X. Other (please specify)

[Answer]: B (i18next) **Mode:** guided
