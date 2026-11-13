# Röktest — EPIC-04 US-0402 och US-0403

Underlag: `construction/build-and-test/test-results.md`.

Röktestet kördes i riktig Electron med samma kod som i PR #9.

| Kontroll | Resultat |
|----------|----------|
| Utseende vid 1440 och 2560 px | Matchar mockupen |
| Kontrast | AA för alla viktiga par |
| Bildfrekvens | 60 fps |
| Konsolens storlek | Kan dras och styras med tangentbordet |
| Konsolfel | 0 |

De paketerade dmg- och deb-filerna röktestas när v0.2.0 släpps.
