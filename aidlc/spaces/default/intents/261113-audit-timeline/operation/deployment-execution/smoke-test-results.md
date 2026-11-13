# Röktest — EPIC-03

Underlag: `construction/build-and-test/test-results.md`.

Röktestet kördes i riktig Electron med samma kod som i PR #7:

| Kontroll | Resultat |
|----------|----------|
| visinvs `epic02-finish` | 1 726 av 1 726 händelser när brus visas. Inget tak |
| 20 000 händelser | En filterändring tar 24–34 ms. Scrollningen ligger på p95 25 ms per bildruta |
| Sen händelse | Markeras exakt, och räknaren visar "1 ny händelse" |
| Konsolfel | 0 |

De paketerade dmg- och deb-filerna röktestas när v0.2.0 släpps.
