# Kodsammanfattning — EPIC-04 US-0406 Namnet T.H.A.D.E.U.S.

Express, Minimal, test-after. Alla fem stegen i `code-generation-plan.md` är byggda och avbockade. Inga nya beroenden. Repo-namnet och userData-mappen `aidlc-dash` är oförändrade.

## Ändrade och nya filer

| Fil | Ändring | Krav |
|-----|---------|------|
| `src/shared/appName.js` (ny) | `APP_NAME`, `APP_FULL_NAME`, `APP_TAGLINE`, `APP_SHORT`, `APP_VENDOR` | FR1.1 |
| `src/main/menu.js` | Namnet från modulen. About-panelen får `copyright: '© Auctum'` och `credits` med det utskrivna namnet och taglinen | FR2.4 |
| `src/main/index.js` | Fönstertiteln är `APP_NAME`. `app.setPath('userData', …'aidlc-dash')` står kvar med en omskriven kommentar | FR2.3, FR4.1 |
| `src/renderer/index.html` | `<title>T.H.A.D.E.U.S.</title>` | FR2.3 |
| `src/renderer/App.jsx` | Märkesblocket visar bara `APP_NAME`. Underraden "Aidlc control" är borta | FR2.1 |
| `src/renderer/Splash.jsx` | Rubriken `APP_NAME` med `APP_FULL_NAME` och `APP_TAGLINE` under. Sr-only-texten är en mening av de tre. Den lokala `APP_NAME`-exporten är borttagen (ingen importerade den) | FR2.2 |
| `src/renderer/theme.css` | `.app-brand-text` 14 px, `letter-spacing: 0.02em`, `white-space: nowrap`. `.app-brand-sub` är borttagen. `.splash-name` med `max-width: min(100%, 760px)` och `text-wrap: balance`, och ny `.splash-name-tagline`. Bara tokens | FR2.1, FR2.2, NFR1 |
| `package.json`, `package-lock.json` | `name: thadeus`, `productName: THADEUS` och en beskrivning med det utskrivna namnet. Låsfilen är uppdaterad med `npm install --package-lock-only` | FR3.1 |
| `electron-builder.yml` | `appId: se.auctum.thadeus`, `productName: THADEUS`, `executableName: thadeus`, `linux.desktop.entry.Name`, `dmg.artifactName`, `deb.artifactName`, `deb.fpm` | FR3.1, FR3.2 |
| `.github/workflows/release.yml` | Kommentaren och titeln `"T.H.A.D.E.U.S. ${GITHUB_REF_NAME}"`. Globbarna är oförändrade | FR3.3 |
| `README.md` | Ny inledning och avsnittet "Uppgradera från Auctum AIDLC Control" (macOS och Linux) | FR4.2, FR5.1 |
| `docs/features/epic-04-branding-and-desktop.md` | US-0406 är markerad som byggd, inte släppt. Kriterierna är ikryssade utom layouten, som mäts i Build and Test | FR5.1 |
| `tests/main/appName.test.js` (ny) | Tre tester: namnformerna, inga gamla namn i `src/` (kommentarer undantagna) och userData-låset | FR1.1, FR5.1, FR4.1 |
| `tests/main/menu.test.js` | Etiketterna "T.H.A.D.E.U.S.", "Om …", "Göm …" och "Avsluta …" | FR2.4 |
| `tests/main/windowOptions.test.js` | Ett nytt test: fönstertiteln kommer från modulen | FR2.3, NFR2 |
| `tests/renderer/Splash.test.jsx` | Rubrik, utskrivet namn, tagline och sr-only-meningen. `role="img"` "Auctum" står kvar | FR2.2 |
| `tests/renderer/AppShell.test.jsx` | Märkesblocket visar "T.H.A.D.E.U.S." och ingen "Aidlc control" | FR2.1 |

## Kontroll av electron-builder 26 (app-builder-lib 26.18.0, `scheme.json`)

- `linux.desktop` är ett `LinuxDesktopFile` med `entry` och `desktopActions`, och `additionalProperties: false`. Den gamla platta formen (`linux.desktop.Name`) avvisas, så formen är `desktop.entry.Name`. Deb-målet slår ihop `linux` och `deb` (`FpmTarget`), så posten gäller för deb-paketet.
- `dmg.artifactName` och `deb.artifactName` är strängar. `${arch}` blir `amd64` för deb (`getArtifactArchName`) och `universal` för dmg.
- `deb.fpm` är en lista med strängar som läggs till fpm-argumenten (`FpmTarget.js:214`).
- `linux.executableName` är en sträng.
- Hela `electron-builder.yml` gick igenom electron-builders egen `validateConfiguration` (VALID). Som motprov avvisades `deb.bogus` och den platta `linux.desktop.Name`.
- Deb-paketets namn kommer från `name` i `package.json` (`appInfo.linuxPackageName`), alltså `thadeus`.

## Körningar

- Baslinje före ändringarna: `npx vitest run tests/` gav 32 filer och 112 tester, alla gröna.
- Efter ändringarna: `npx vitest run tests/` gav 33 filer och 116 tester, alla gröna (112 befintliga och 4 nya: 3 i `appName.test.js` och 1 i `windowOptions.test.js`).
- `npx electron-vite build` lyckades. "T.H.A.D.E.U.S." finns i `out/main/index.js`, i renderer-bundlen och i `out/renderer/index.html`, så modulen bundlas till båda utan alias. `electron.vite.config.mjs` är inte ändrad.
- Paketeringsbyggena (`npm run build`) kördes inte. De körs i Build and Test.

## Beslut

- `version` skickas inte till `setAboutPanelOptions`. Det är byggnumret, och utan det visar macOS `CFBundleVersion`, som electron-builder sätter till samma version. Med det hade panelen visat "0.2.0 (0.2.0)" på samma sätt.
- `app.setName` används inte. Menyns etiketter sätts i mallen, och macOS fetstilta appnamn i dev kommer från Electron-bundlen oavsett. I paketerad app är `app.getName()` "THADEUS", och det är också fönstrets WM_CLASS på Linux. Det stämmer med `StartupWMClass`, som electron-builder sätter till `productName`.
- `<title>` i `index.html` är statisk text, som planen säger. Det är det enda stället utanför modulen som skriver namnet. Testet för gamla namn vaktar att inget gammalt namn finns kvar där.
- fpm-flaggorna skrivs som `--replaces=aidlc-dash` och `--conflicts=aidlc-dash`, så att varje flagga är ett argument.

## Att verifiera i Build and Test

- Skärmdumpar vid 1100 × 800 och 2560 × 1440. Märkesblocket har ungefär 84 px för texten, och "T.H.A.D.E.U.S." i 14 px är uppskattat till ungefär 70–75 px. Det är inte mätt.
- `THADEUS.app`, `CFBundleIdentifier` `se.auctum.thadeus` och `THADEUS-0.2.0-universal.dmg`.
- `dpkg-deb -f` på deb-paketet: `Package: thadeus` och `Replaces`/`Conflicts: aidlc-dash`. Startposten visar "T.H.A.D.E.U.S.".
- Dock och Finder visar "THADEUS" (`CFBundleName`), inte punktformen. Det följer av antagandet om kortformen i kraven.
