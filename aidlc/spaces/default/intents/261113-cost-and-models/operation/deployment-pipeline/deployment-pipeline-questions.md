# Deployment Pipeline — frågor EPIC-02

Underlag: användarens mål i chatten ("Mitt mål är att vi ska få Iväg det UC stories som vi har definierat hittills. Och sen bygga en ny release för både Linux och Mac") och den befintliga pipelinen i `.github/workflows/release.yml`.

## Fråga 1
Behövs ändringar i pipelinen för EPIC-02?

A. Nej, den befintliga pipelinen räcker (tagg `v*.*.*`, universell dmg, deb på ubuntu-22.04 med glibc-kontroll)
X. Other (please specify)

[Answer]: A. EPIC-02 lägger inte till några nya beroenden eller nativa moduler.

## Fråga 2
När släpps EPIC-02?

A. I en samlad release, v0.2.0, när alla definierade storys är klara
X. Other (please specify)

[Answer]: A. Användarens beslut i chatten (meddelande 21d0ce27).
