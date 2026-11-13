# Röktest — EPIC-06

Underlag: `construction/build-and-test/test-results.md`.

Röktestet kördes i riktig Electron med samma kod som i PR #8:

| Kontroll | Resultat |
|----------|----------|
| Features öppnas | 25 ms och 6 epics |
| Story-länk | US-0501 länkar till `261113-workflow-control` |
| Liveuppdatering | 406 ms |
| Projektinställningar | Dölj, Automatiskt och spärr av ogiltig sökväg fungerar |
| Konsolfel | 0 |

De paketerade dmg- och deb-filerna röktestas när v0.2.0 släpps.
