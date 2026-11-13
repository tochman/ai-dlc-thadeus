# Deployment Pipeline — frågor

Leveransmålet är en osignerad macOS-app (`dist/Auctum AIDLC Control-<version>.dmg`) från `npm run build`, och appen används bara internt. Det finns inga servrar eller miljöer att driftsätta till. "Deployment" betyder här hur appen byggs och delas ut till dem som ska använda den.

## Q1. [Release] Hur ska appen delas ut internt?

Avgör om det behövs en automatisk pipeline eller om ett lokalt bygge räcker.

A. GitHub Releases i det privata repot `tochman/aidlc-dash`. En GitHub Actions-workflow på en macOS-runner bygger `.dmg`:en och laddar upp den.
B. Bara lokalt bygge. Den som vill ha appen kör `npm run build` och installerar själv.
C. Lokalt bygge som laddas upp manuellt till en delad mapp, till exempel Google Drive.
X. Other (please specify)

[Answer]: A

## Q2. [Release] Vad ska starta ett nytt bygge och hur sätts versionen?

Gäller bara om svaret på Q1 är automatiskt. Det styr när en ny version blir tillgänglig.

A. En git-tagg `vX.Y.Z` på `main`. Versionen i `package.json` ska matcha taggen.
B. En manuell knapp (`workflow_dispatch`) i GitHub Actions, med versionen från `package.json`.
C. Varje merge till `main` bygger en ny release automatiskt.
X. Other (please specify)

[Answer]: A

## Q3. [Release] Vilka Mac-arkitekturer ska byggas?

Bygget i dag ger bara x86_64 (Intel), eftersom det följer maskinen det byggs på. Apple Silicon-Macar kör x64-appen via Rosetta, men node-pty och terminalen fungerar bäst inbyggt.

A. Universal (x64 och arm64 i samma app). Fungerar inbyggt på alla Macar men gör appen ungefär dubbelt så stor.
B. Två separata `.dmg`-filer, en för x64 och en för arm64.
C. Bara x64, som i dag.
X. Other (please specify)

[Answer]: A — "Universal EN VI BEHÖVER ÄVEN BYGGA FÖR LINUX"

## Q4. [Release] Vilket Linux-format ska byggas?

Följdfråga till Q3, där svaret var att det även behövs Linux. Tidigare var Linux utanför omfånget, så det här utökar NFR5 från bara macOS till macOS och Linux. Bygget körs på en Ubuntu-runner i GitHub Actions, och node-pty byggs för Linux där.

A. AppImage (x64). En fil som går att köra direkt på de flesta distributioner utan installation.
B. AppImage och .deb (x64). .deb installeras via apt på Debian och Ubuntu.
C. Bara .deb (x64)
X. Other (please specify)

[Answer]: C
