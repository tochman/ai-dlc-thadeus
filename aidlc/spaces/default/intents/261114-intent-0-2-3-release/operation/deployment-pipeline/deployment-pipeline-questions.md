# Deployment Pipeline – frågor (v0.2.3)

Underlag: `.github/workflows/release.yml` finns redan. På en `v*.*.*`-tagg kör den testsviten, bygger macOS `.dmg` och Linux `.deb`, skriver `SHA256SUMS.txt` (som uppdateraren i US-0407 kontrollerar nedladdningen mot) och skapar en GitHub Release. Releasevägen är redan bestämd i Requirements Analysis (FR3.4): branchen `release/v0.2.3`, en PR till `main` och taggen `v0.2.3` efter merge. Uppdateraren hoppar över releaser som är draft eller prerelease.

## Q1. [Releaseingenjör] Hur ska v0.2.3 publiceras när taggen är satt?

Linux-kontrollen (FR2.2) kräver den `.deb` som CI bygger, så den kan inte göras förrän workflowet har kört.

A. Som i dag: workflowet publicerar direkt som en vanlig release (blir "latest").
B. Workflowet publicerar som prerelease. Jag testar `.deb` på Linux och markerar den sedan som latest för hand (`gh release edit v0.2.3 --prerelease=false --latest`).
X. Other (please specify)

[Answer]: X. vi väntar tills alla small fixes are in place

## Q2. [Releaseingenjör] Vad gör vi om v0.2.3 visar sig vara trasig efter publicering?

A. Rätta framåt med v0.2.4. Under tiden markeras v0.2.3 som prerelease, så att uppdateraren slutar erbjuda den och v0.2.2 åter blir "latest".
B. Ta bort releasen och taggen `v0.2.3`, rätta och tagga om samma version.
X. Other (please specify)

[Answer]: A

## Q3. [Releaseingenjör] När EPIC-00-fixarna är klara och taggen sätts: vanlig release direkt eller prerelease först?

Svaret på Q1 säger när taggen sätts (först när alla små fixar är på plats), men inte hur releasen publiceras.

A. Vanlig release direkt (blir "latest").
B. Prerelease först. Efter Linux-testet av `.deb` markeras den som latest.
X. Other (please specify)

[Answer]: A
