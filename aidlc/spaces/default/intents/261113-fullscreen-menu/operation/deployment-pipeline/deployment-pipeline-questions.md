# Deployment Pipeline — frågor EPIC-04 US-0404

Underlag: `.github/workflows/release.yml` och användarens beslut om en samlad release (meddelandena 21d0ce27 och f06ec440).

## Fråga 1
Behöver pipelinen ändras för US-0404?

A. Nej. Det tillkommer inga nya beroenden eller byggsteg. `app.isPackaged` tar bort utvecklingsmenyn i paketet automatiskt.
X. Other (please specify)

[Answer]: A.

## Fråga 2
Hur släpps US-0404?

A. Som en PR med uppdaterad README och nya skärmdumpar. Efter merge taggas `v0.2.0`, och GitHub Actions bygger dmg och deb.
X. Other (please specify)

[Answer]: A. Användarens beslut om en samlad v0.2.0 och om README-bilder (meddelande 55a9911b).
