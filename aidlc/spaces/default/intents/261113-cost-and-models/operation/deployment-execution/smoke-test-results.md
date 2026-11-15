# Röktest — EPIC-02

Underlag: `construction/build-and-test/test-results.md`.

Röktestet kördes i riktig Electron mot `a reference project`, med samma kod som ligger i PR #5:

| Kontroll | Resultat |
|----------|----------|
| Projektpanel | `KOSTNAD $1160.27*` (asterisken betyder att ett pris saknas) |
| Kostnad per intent och sortering | Fungerar |
| Fliken Kostnad | Märkt "Uppskattad kostnad (API-pris)" |
| Modeller | Källa `aidlc-config`, 14 agenter |
| Ny ledger efter att projektet har öppnats | Syns efter 321 ms |
| Konsolfel | 0 |

De paketerade dmg- och deb-filerna röktestas när v0.2.0 släpps.
