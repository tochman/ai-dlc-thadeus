# Deployment Pipeline — frågor EPIC-04 US-0406

Underlag: `.github/workflows/release.yml` och användarens svar (meddelande 30af0c3c).

## Fråga 1
Behöver pipelinen ändras utöver releasetiteln?

A. Nej. Globbarna `dist/*.dmg`, `dist/*.deb` och `artifacts/*/*` hittar de nya filnamnen.
X. Other (please specify)

[Answer]: A.

## Fråga 2
Ska en ny version släppas direkt efter merge?

A. Ja, v0.3.0 med US-0505 och US-0406.
B. Nej, bara PR och ingen tagg. Releasen bestäms senare.
X. Other (please specify)

[Answer]: B. "Bara PR, ingen tagg" (meddelande 30af0c3c).
