# Röktest — EPIC-05 US-0505

Underlag: `construction/build-and-test/test-results.md`.

Testat i riktig Electron med samma kod som i PR #11, med riktiga grindar:
- popupen visas, och notisen kommer
- popupen eskalerar efter 20 s
- "Svara i Claude" sätter fokus i terminalen
- inga konsolfel

Notiserna i den paketerade appen röktestas vid nästa release.
