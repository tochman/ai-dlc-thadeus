# Säkerhetstester — EPIC-05 US-0505

Underlag: `requirements.md` NFR1 och NFR2.

- Frågetexten visas som React-text, aldrig som HTML.
- `Options` tolkas i try/catch.
- `questions:activeProject` validerar strängen.
- Inga skrivningar till projekt. Bara den egna `settings.json` (`questionAlerts`, `notificationSound`) skrivs.
