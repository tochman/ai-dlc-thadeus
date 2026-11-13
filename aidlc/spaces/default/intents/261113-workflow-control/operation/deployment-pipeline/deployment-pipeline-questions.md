# Deployment Pipeline — frågor EPIC-05

Underlag: användarens mål i chatten (meddelande 21d0ce27: få iväg de storys som har definierats och sedan bygga en ny release för både Linux och Mac), `.github/workflows/release.yml` och `construction/build-and-test/build-instructions.md`.

## Fråga 1
Behöver pipelinen ändras för EPIC-05?

A. Nej. `npm ci` i CI kör den nya `postinstall`, som även sätter körrättighet på node-pty:s `spawn-helper`. Det räcker för att den paketerade Mac-appen ska kunna starta terminalen.
X. Other (please specify)

[Answer]: A. Inga nya beroenden har lagts till.

## Fråga 2
När släpps EPIC-05?

A. I den samlade releasen v0.2.0, när alla definierade storys är klara.
X. Other (please specify)

[Answer]: A. Användarens beslut i chatten (meddelande 21d0ce27), samma upplägg som för EPIC-02.
