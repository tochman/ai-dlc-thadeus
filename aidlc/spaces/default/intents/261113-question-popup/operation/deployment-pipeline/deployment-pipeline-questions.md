# Deployment Pipeline — frågor EPIC-05 US-0505

Underlag: `.github/workflows/release.yml` och användarens beslut att US-0505 ska komma efter v0.2.0 (meddelande 5d344da0).

## Fråga 1
Behöver pipelinen ändras?

A. Nej. Det finns inga nya beroenden, och Electrons `Notification` ingår i Electron.
X. Other (please specify)

[Answer]: A.

## Fråga 2
Hur släpps US-0505?

A. Som en PR utan egen tagg. Nästa release, till exempel v0.3.0 tillsammans med US-0406 (namnet T.H.A.D.E.U.S.), taggas när användaren bestämmer det.
X. Other (please specify)

[Answer]: A. US-0406 ligger närmast i kön (meddelande 23926cd9).
