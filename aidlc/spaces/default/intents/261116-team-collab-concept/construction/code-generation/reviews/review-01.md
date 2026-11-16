## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-16T12:48:55Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | src/main/credentials.js > saveBitbucket | Koden litar på `safeStorage.isEncryptionAvailable()`. På Linux (appen levererar en `.deb`) returnerar den true även när Electron faller tillbaka på backend `basic_text`, där nyckeln är hårdkodad och krypteringen i praktiken är skenbar. Appens lösenord sparas då som om det vore skyddat. Testerna stubbar bara true/false. | Läs `safeStorage.getSelectedStorageBackend?.()` på Linux och behandla `basic_text` (och `unknown`) som "ingen nyckelring", eller säg uttryckligen i inställningsvyn att skyddet är svagt. Lägg till ett test för den grenen. | New |
| R-02 | Minor | tests/main/credentials.test.js | Koden skriver filen med `mode: 0o600`, och kommentaren i credentials.js lovar det, men inget test kontrollerar filens rättigheter. Ändras `mode` bryts inget test. | Lägg till en `statSync(...).mode & 0o777`-kontroll (hoppa över på Windows). | New |
| R-03 | Minor | src/main/platforms/github.js, gitlab.js, bitbucket.js > pulls() | `Promise.all` över upp till 50 pull requests startar upp till 50 samtidiga `gh api`/`glab api`-processer per anrop. Dessutom hämtar `team:collisions` och `team:comments` (via `pullsOf`) hela listan var för sig, utan delad cache. Med 15 s tak per anrop riskerar ett större team timeout och rate limit, och felet visas då som `timeout`. `ponytail:`-kommentaren nämner bara sidstorleken, inte fan-out. | Begränsa samtidigheten (till exempel 5 åt gången) och/eller cacha pull-listan kort per projekt och uppdatering. Lägg till en rad i `ponytail:`-kommentaren om taket. | New |
| R-04 | Minor | src/main/ipc.js > handler `team:refresh` / src/preload/index.js > `teamRefresh` | Kanalen `team:refresh` (som kör `git fetch`) exponeras via bryggan, men inget i renderaren anropar `teamRefresh`; panelen använder den befintliga uppdateringsknappen. Det är en oanvänd kanal som kan hämta från nätverket, vilket gör påståendet "hämtar aldrig av sig själv" svårare att verifiera. | Ta bort `team:refresh` och `teamRefresh`, eller låt Uppdatera-knappen använda den och lägg till ett test som visar det. | New |
| R-05 | Minor | src/main/ipc.js > `teamCollisions`, `BASE`, `platformOf` | `BASE = 'origin/main'` är hårdkodat, så ett repo vars standardgren heter något annat visar bara "ingen bas". `p.platform` cachas för hela projektets livstid, så en ändrad `origin` syns inte förrän projektet öppnas om. En pull request från en fork vars gren heter som den lokala grenen tas dessutom för grenens egen (`p.branch === localBranch`). | Läs standardgrenen från `refs/remotes/origin/HEAD`, och jämför helst även ägare/repo för den egna pull requesten. Annars dokumentera begränsningarna med `ponytail:`. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| npx vitest run (12 angivna filer) | PASS: 12 filer, 142 tester | Alla angivna tester gröna. git-testet kör riktig `merge-tree` mot temporära repon och kontrollerar att arbetskatalog, index och HEAD är oförändrade. |
| npx eslint src tests | 0 fel, 25 varningar | Varningarna är `react-hooks/exhaustive-deps` i filer utanför US-1201 (TokenView, UpdateNotice, useFeatures, EditorPanel-testet). Inget blockerar. |

### Summary

Designen håller för de punkter som granskades. Lösenordet går bara in (`credentials:bitbucket` svarar `{set}`), loggas inte och sparas inte utan fungerande nyckelring. Alla gh-, glab- och git-anrop går via `execFile` utan skal. Vägsegment valideras i `detectPlatform`, pull request-nummer med `checkNumber` och refs med `safeArg` med prefixet `origin/`. Fel från plattformarna kommer som värden, och `merge-tree` rör varken arbetskatalog eller index. Appen skriver inget under `aidlc/` (`team:mergeNote` löser bara upp sökvägen). Kvarstår bara Minor-fynd, främst nyckelringens styrka på Linux, den obegränsade fan-outen och en oanvänd fetch-kanal.
