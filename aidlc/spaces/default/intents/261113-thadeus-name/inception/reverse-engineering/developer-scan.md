# Utvecklarskanning: aidlc-dash (intent 261113-thadeus-name, US-0406)

Fokuserad skanning ovanpå en STALE store (senast byggd av intent `261113-question-popup`). Fokus: allt som bär appens namn, paketidentitet, artefaktnamn och den fastlåsta userData-mappen inför bytet från "Auctum AIDLC Control" till "T.H.A.D.E.U.S." (US-0406, `docs/features/epic-04-branding-and-desktop.md`). Commit `8623af40b2eaf4b3676bb5dfad0e66865a2695b5`. Inga tester, byggen eller program kördes.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - src/renderer/index.html
  - src/renderer/Splash.jsx
  - src/renderer/theme.css
  - src/renderer/App.jsx
  - src/renderer/TerminalPanel.jsx
  - src/main/menu.js
  - src/renderer/AuctumMark.jsx
  - src/main/index.js
  - tests/main/menu.test.js
  - tests/renderer/AppShell.test.jsx
  - tests/renderer/Splash.test.jsx
  - .github/workflows/release.yml
  - package.json
  - README.md
  - electron-builder.yml
- **Skimmed only** (bara namnsökning med grep eller kataloglistning, inga djupa läsningar):
  - src/main/notify.js, src/main/questions.js, src/main/ipc.js, src/main/settings.js, src/preload/index.js (US-0505:s kanaler och notistitel)
  - src/renderer/QuestionPopup.jsx (bara importen i App.jsx)
  - package-lock.json (raderna med `"name"`)
  - docs/FEATURES.md, docs/features/ (namnförekomster; US-0406:s story lästes som krav, inte som kod)
  - tests/main/, tests/renderer/ (fillistor; grep efter namnet)
- **Left out**:
  - node_modules/
  - out/
  - dist/
  - tests/.tmp/
  - AI-DLC:s egen installation (`.claude/`, `aidlc/`, AI-DLC:s markerade del av `.gitignore`)

### Packages Found
- aidlc-dash — Electron-skrivbordsapp (main, preload, renderer) — JavaScript (ESM) och JSX — "bridge console" för AI-DLC-projekt; `name` i `package.json:2`, `productName` "Auctum AIDLC Control" i `package.json:3`, version `0.2.0` (`package.json:4`)

### Build System
- **Type**: npm + electron-vite (bygger `out/`) + electron-builder (paketerar `dist/`)
- **Config Files**: `package.json`, `electron-builder.yml`, `.github/workflows/release.yml` (electron-vite- och vitest-konfig inte omlästa)
- **Build Dependencies**: `build`/`build:mac` = `electron-vite build && electron-builder --mac`; `build:linux` = `electron-vite build && electron-builder --linux`; `postinstall` = `electron-builder install-app-deps && node scripts/fix-pty-perms.cjs`. electron-builder läser `appId` och `productName` ur `electron-builder.yml` (som också upprepar `productName`) och `name`/`version`/`author` ur `package.json`. Inget `artifactName` är satt någonstans, så filnamnen följer electron-builders standardmönster (se Handoff Summary).

### APIs Discovered
- Electron IPC — `src/preload/index.js` (skummad) — oförändrat för US-0406; inga kanaler bär appnamnet. US-0505 lade till `questions:list`, `questions:activeProject` (invoke) och `questions:changed`, `questions:focus` (push), som store saknade.
- Electron app-API:er som bär namnet — `src/main/menu.js:156` `app.setAboutPanelOptions({applicationName, applicationVersion})`; `src/main/index.js:8` `app.setPath('userData', …)`; `src/main/index.js:26` `BrowserWindow`-titel.

### Frameworks & Libraries
- electron — ^45.3.1 — runtime; `app`, `BrowserWindow`, `Menu`, `shell`, `Notification` (US-0505, i `notify.js`)
- electron-builder — ^26.18.0 — `.dmg` (universal) och `.deb` (x64)
- electron-vite — ^6.0.0 — bygger main, preload, renderer
- react / react-dom — ^19.3.1 — UI
- @fontsource/antonio — ^5.3.0 — rubrikfonten som namnet sätts i (versaler)
- vitest — ^5.1.0; @testing-library/react — ^16.3.3; jsdom — ^29.1.1 — test
- Övriga (xterm, node-pty, chokidar, react-markdown, remark-gfm, @tanstack/react-virtual) oförändrade, versioner i `package.json:22-43`

### Test Coverage
- **Test Directories**: `tests/main/` (18 filer, nu med `questions.test.js`), `tests/renderer/` (14 filer, nu med `QuestionPopup.test.jsx`), `tests/fixtures/`
- **Test Frameworks**: Vitest (projekt `main`/node och `renderer`/jsdom), Testing Library React
- **Coverage Config**: absent
- **Tester som bär namnet** (måste följa med, US-0406 sista kriteriet):
  - `tests/main/menu.test.js:83` förväntar sig att macOS-menyernas etiketter börjar med `'Auctum AIDLC Control'`
  - `tests/main/menu.test.js:84` hämtar `'Om Auctum AIDLC Control'` och kräver `role: 'about'`
  - `tests/renderer/Splash.test.jsx:16` `getByRole('img', { name: 'Auctum' })` (märket, ska stå kvar)
  - `tests/renderer/Splash.test.jsx:17` `getByText('Auctum AIDLC Control')` (den dolda `sr-only`-texten `APP_NAME`, exakt matchning)
  - `tests/renderer/AppShell.test.jsx:121` `within(header).getByRole('img', { name: 'Auctum' })` (ska stå kvar)
  - `tests/renderer/AppShell.test.jsx:122` `within(header).getByText('Aidlc control')` (sidhuvudets underrad, exakt matchning)
  - Ingen test hävdar fönstertiteln, `<title>`, userData-sökvägen, `appId` eller artefaktnamnen (grep efter namnet i `tests/` gav bara träffarna ovan; `aidlc-dash` i `AppShell`, `QuestionPopup` och `questions`-testerna är projektmappnamn i fixtures, inte appnamnet).

### Code Quality Indicators
- **Linting**: ingen ESLint/Prettier-konfig i de lästa filerna (oförändrat)
- **CI/CD**: `.github/workflows/release.yml` — `verify` (tagg = `package.json`-version, `npm ci`, `npx vitest run tests/`), `build-mac` (macos-latest, laddar upp `dist/*.dmg`), `build-linux` (ubuntu-22.04, glibc-kontroll, laddar upp `dist/*.deb`), `release` (bara på tagg, `gh release create` med titel)
- **Documentation**: `README.md` (svenska, 57 rader) börjar med det gamla namnet och dokumenterar inställningssökvägarna; kod har korta kommentarer med krav-ID:n

### Technical Debt Signals
- Appnamnet är hårdkodat på sex ställen i koden utan gemensam källa: `Splash.jsx:5` (`APP_NAME`, exporterad men inte importerad av någon annan), `menu.js:5` (egen `APP_NAME`), `index.js:26` (fönstertitel), `index.html:9` (`<title>`), `App.jsx:331-334` och `Splash.jsx:50-53` (dekorativ tvåradig text "Auctum"/"Aidlc control"). Två identitetskällor för paketering: `productName` både i `package.json:3` och `electron-builder.yml:2`.
- `index.js:7` kommentaren nämner det gamla namnet som "productName changed to …"; den förklarar varför userData är fastlåst och blir missvisande efter bytet om den inte skrivs om.
- `.app-brand` (`theme.css:307-319`) har fast bredd `var(--arm)` = 150 px och `.app-brand-text` (`theme.css:321`) saknar `white-space`/`overflow`-regler, så en längre text flödar ut i stället för att kortas.
- `release.yml:1` och `release.yml:91` har namnet i klartext.

## Handoff Summary

- **Intent-relevant finding**: fullständig inventering av namnet (fil:rad, nuvarande text, vad den styr):

  | Fil:rad | Nuvarande text | Styr |
  |---------|----------------|------|
  | `package.json:2` | `"name": "aidlc-dash"` | npm-paketnamn; electron-builders standardnamn för `.deb`-paketet och dess filnamn (`${name}_${version}_${arch}.deb` → i dag `aidlc-dash_0.2.0_amd64.deb`); Electrons standard-userData om den inte vore fastlåst; `package-lock.json:2` och `:8` följer det |
  | `package.json:3` | `"productName": "Auctum AIDLC Control"` | `app.getName()`; macOS `.app`-namn och `CFBundleName` (Dock, Finder, appväxlaren, menyradens fetstilta appnamn i paketerad app); standardnamnet för `.dmg` (`${productName}-${version}-${arch}.dmg` → i dag `Auctum AIDLC Control-0.2.0-universal.dmg`); Linux-installationsmapp och `.desktop`-postens `Name` |
  | `package.json:6` | `description` (utan namn) | `.deb`-beskrivning; ingen ändring krävs |
  | `package.json:11` | `homepage …/aidlc-dash` | repo-länk; oförändrad (repo-namnet byts inte) |
  | `electron-builder.yml:1` | `appId: se.auctum.aidlc-control` | macOS `CFBundleIdentifier`: appens identitet för Launch Services, Dock-fästning, notisbehörighet (US-0505:s `Notification`) och Gatekeeper-/TCC-beslut |
  | `electron-builder.yml:2` | `productName: Auctum AIDLC Control` | samma som `package.json:3`; filen vinner för electron-builder, så båda måste ändras lika |
  | `electron-builder.yml:20-29` | `mac.target dmg universal`, inget `artifactName` | `.dmg`-namnet följer standardmönstret ovan |
  | `electron-builder.yml:30-43` | `linux.target deb x64`, inget `artifactName` | `.deb`-namnet följer `name` |
  | `electron-builder.yml:41` | `executableName: auctum-aidlc-control` | Linux-binärens namn, `.desktop`-filens namn och ikonfilernas namn i hicolor-temat |
  | `electron-builder.yml:42-43` | `maintainer`, `synopsis` (utan appnamn) | `.deb`-metadata; ingen ändring krävs |
  | `.github/workflows/release.yml:1` | kommentar "Builds Auctum AIDLC Control …" | dokumentation |
  | `.github/workflows/release.yml:51`, `:72`, `:89` | `dist/*.dmg`, `dist/*.deb`, `artifacts/mac/*.dmg artifacts/linux/*.deb` | uppladdning och release; globbarna beror bara på filändelsen, inte på namnet, så de håller efter bytet |
  | `.github/workflows/release.yml:91` | `--title "Auctum AIDLC Control ${GITHUB_REF_NAME}"` | releasens titel på GitHub |
  | `src/renderer/index.html:9` | `<title>Auctum AIDLC Control</title>` | dokumentets titel; Electron låter sidans `<title>` skriva över `BrowserWindow`-titeln när sidan laddats (ingen `page-title-updated`-spärr finns), så detta är fönstertiteln personen ser |
  | `src/main/index.js:26` | `title: 'Auctum AIDLC Control'` | fönstertitel innan sidan laddats |
  | `src/main/index.js:7` | kommentar "productName changed to "Auctum AIDLC Control"; keep the old userData folder so saved tabs survive." | förklarar låsningen |
  | `src/main/index.js:8` | `app.setPath('userData', join(app.getPath('appData'), 'aidlc-dash'))` | userData-låset: `settings.json` (öppna projekt, animationer, helskärm, notisval) ligger kvar oberoende av `productName`; körs före `whenReady` |
  | `src/main/menu.js:5` | `const APP_NAME = 'Auctum AIDLC Control'` | macOS-appmenyns etikett (`:42`), "Om …" (`:44`), "Göm …" (`:48`), "Avsluta …" (`:52`) och About-panelens `applicationName` (`:156`) |
  | `src/main/menu.js:156` | `app.setAboutPanelOptions({ applicationName: APP_NAME, applicationVersion: app.getVersion() })` | macOS About-panelen; i dag utan `credits`/`copyright`, så det utskrivna namnet och taglinen saknar plats tills ett fält läggs till |
  | `src/main/menu.js:64` | `{ role: 'quit', label: 'Avsluta' }` (Linux) | inget namn; Linux har ingen About-post i menyn |
  | `src/renderer/Splash.jsx:5` | `export const APP_NAME = 'Auctum AIDLC Control'` | den dolda `span.sr-only` (`:54`) som skärmläsare läser och som `Splash.test.jsx:17` hittar |
  | `src/renderer/Splash.jsx:49` | `<AuctumMark size={300} className="splash-mark" />` | icke-dekorativt märke, `role="img"` med `aria-label="Auctum"` (kontraktet i `Splash.test.jsx:16`; ska stå kvar) |
  | `src/renderer/Splash.jsx:50-53` | `div.splash-name[aria-hidden]` > `span.splash-name-main` "Auctum", `span.splash-name-sub` "Aidlc control" | den synliga tvåradiga texten (dekoration, versaler via CSS) |
  | `src/renderer/App.jsx:330` | `<AuctumMark size={46} className="app-mark" />` | sidhuvudets märke, `role="img"` "Auctum" (`AppShell.test.jsx:121`; ska stå kvar) |
  | `src/renderer/App.jsx:331-334` | `span.app-brand-text` > "Auctum", `span.app-brand-sub` "Aidlc control" | märkesblocket i sidhuvudets armbåge (inte `aria-hidden`, så det läses upp) |
  | `src/renderer/App.jsx:441` | `'Auctum'` i `arm-foot-label` när projektet inte är AI-DLC | armens fot; Auctum-namnet, inte appnamnet |
  | `src/renderer/App.jsx:458` | `AuctumMark size={96}` i tomläget | märke, `role="img"` "Auctum" |
  | `src/renderer/AuctumMark.jsx:4` | `role: 'img', 'aria-label': 'Auctum'` (eller `aria-hidden` när `decorative`) | märkets tillgängliga namn; US-0406 behåller symbolen |
  | `src/renderer/TerminalPanel.jsx:7`, `:230` | `AuctumMark size={96} … decorative` i terminalens armbåge | dekorativt; inget appnamn i terminalpanelen |
  | `README.md:1` | `# Auctum AIDLC Control` | rubrik |
  | `README.md:3` | "Auctum AIDLC Control (repo: `aidlc-dash`) är …" | introduktion; ska få utskrivet namn och tagline |
  | `README.md:41` | högerklick + Öppna för Gatekeeper | gäller även den nya osignerade appen |
  | `README.md:53` | `~/Library/Application Support/aidlc-dash/settings.json`, `~/.config/aidlc-dash/settings.json` | korrekta så länge `index.js:8` behåller `aidlc-dash` |
  | `tests/main/menu.test.js:83-84`, `tests/renderer/Splash.test.jsx:17`, `tests/renderer/AppShell.test.jsx:122` | se Test Coverage | måste uppdateras |
  | utanför snapshot (bara grep) | `docs/FEATURES.md:1`, `docs/features/epic-01-bridge-console-mvp.md:154`, `docs/features/epic-04-branding-and-desktop.md:7`, `:94` | feature-dokument; enligt US-0406 bara i historiken |

  CSS som dimensionerar namnet:
  - `theme.css:307-319` `.app-brand`: `width: var(--arm)` (150 px), `height: 64px`, `padding-right: 12px`, `gap: 8px`, `justify-content: flex-end`, `border-radius: 40px 0 0 0`, amber bakgrund med `--on-light` (svart) text. Med märket 46 px återstår ungefär 84 px för texten.
  - `theme.css:321` `.app-brand-text`: 15 px, 700, `letter-spacing: 0.03em`, versaler, `line-height: 1`; ingen `white-space`, `overflow` eller `min-width`. `theme.css:322` `.app-brand-sub`: 10 px, 600, `letter-spacing: 0.08em`. Uppskattning (inte mätt): "T.H.A.D.E.U.S." i Antonio Bold 15 px tar ungefär 70-80 px, alltså nästan ingen marginal; en underrad med det utskrivna namnet eller taglinen ryms inte i blocket i 10 px. Mät vid 1100 px i Build and Test.
  - `theme.css:810-821` `.splash`: `padding: 40px`, `letter-spacing: 0.04em`, versaler. `theme.css:827` `.splash-arm` 180 px. `theme.css:831` `.splash-center` flex-kolumn, centrerad, `gap: 26px`. Vid 1100 px fönsterbredd är mittytan ungefär 1100 − 80 − 180 = 840 px (vid minsta bredden 960 px ungefär 700 px).
  - `theme.css:834` `.splash-name-main`: 64 px, 700, `letter-spacing: 0.08em` (ryms gott för "T.H.A.D.E.U.S.").
  - `theme.css:835` `.splash-name-sub`: 24 px, 600, `letter-spacing: 0.18em`, `--steel`. Det utskrivna namnet (70 tecken) blir i den storleken ungefär 900-1000 px och radbryts därför till två rader (ingen `nowrap`, så det flödar inte ut). Taglinen (56 tecken) blir ungefär en rad. Ny storlek eller ett tredje element behövs för att det ska se avsiktligt ut.
  - `theme.css:836` `.splash-line` 360 px fast bredd (dekor under namnet).
  - `theme.css:91` `.sr-only` och `theme.css:182` `.lcars-label` (`text-overflow: ellipsis`) är de befintliga verktygen för dold text respektive kapning.
  - Kontrast: `--on-light` (#000) på `--amber` (#ff9e40) i sidhuvudet, `--text` (#e6e9f2) och `--steel` (#4fa3d9) på `--bg` (#05060a) i splashen, alla befintliga par som `theme.css:1-6` anger som AA.

- **Risks / follow-up**:
  1. **`appId` på macOS**: att byta `se.auctum.aidlc-control` gör appen till en ny app för macOS. Dock-fästningen pekar kvar på den gamla, notisbehörigheten för US-0505 måste ges igen och "Öppna med" och Launch Services ser två appar. Att behålla `appId` undviker det, men US-0406 nämner bundle id bland platserna för kortformen. Det är ett beslut för kravanalysen.
  2. **`productName` på macOS**: `.app`-namnet följer `productName`. "THADEUS.app" ersätter inte "Auctum AIDLC Control.app" i Programmappen; båda ligger kvar sida vid sida, vilket US-0406 själv förutser ("README säger att man tar bort …"). Båda delar userData `aidlc-dash`, så om båda körs samtidigt skriver de i samma `settings.json`. Punkter i `productName` ("T.H.A.D.E.U.S.") skulle ge ett `.app`-namn och en Linux-mapp med punkter, så kortformen "THADEUS" passar som `productName`. Då visar menyradens fetstilta appnamn och Dock i paketerad app `CFBundleName` ("THADEUS"), inte etiketten i `menu.js:42`: punktformen syns där bara om Info.plist får ett eget visningsnamn (t.ex. via electron-builders `mac.extendInfo`). Verifiera i en paketerad app; i dev visar macOS "Electron".
  3. **Gatekeeper**: appen är osignerad (`identity: null`, `electron-builder.yml:29`). Den nya appen behöver högerklick och sedan Öppna första gången igen (`README.md:41`), oavsett om `appId` byts.
  4. **`.deb`-paketnamnet**: i dag `aidlc-dash` (från `package.json:2`). Byts det till `thadeus` ser dpkg/apt ett nytt paket: den gamla `aidlc-dash` blir kvar installerad bredvid den nya (två startposter) tills den tas bort, om inte paketet får `Replaces`/`Conflicts`/`Provides: aidlc-dash` (via electron-builders deb-alternativ, t.ex. `fpm`-argument; exakt nyckel i electron-builder 26 är inte verifierad) eller README säger `sudo apt remove aidlc-dash`. Om `package.json` `name` ändras följer `package-lock.json:2` och `:8`; om bara deb-namnet ska ändras behövs ett eget deb-alternativ i stället.
  5. **Artefaktnamn**: utan `artifactName` blir `.dmg` `THADEUS-<version>-universal.dmg` först när `productName` är exakt "THADEUS", och `.deb` `thadeus_<version>_amd64.deb` först när paketnamnet är `thadeus`. Explicita `artifactName` i `mac`/`dmg` och `deb` i `electron-builder.yml` gör namnen oberoende av de valen. CI-globbarna (`release.yml:51`, `:72`, `:89`) bryts inte av bytet; bara titeln (`:91`) ändras.
  6. **Linux-skrivbordspost**: `executableName` (`electron-builder.yml:41`) bestämmer `.desktop`-filens och ikonernas namn, `productName` postens `Name`. Kontrollera efter bygget att fönstret grupperas under startposten (`StartupWMClass` mot fönstrets WM_CLASS) när namnet byts.
  7. **userData**: `index.js:8` måste stå kvar med `aidlc-dash`, och anropet måste fortsätta ligga före `whenReady`. Kommentaren på `index.js:7` bör skrivas om så att den förklarar låsningen utan att nämna "Auctum AIDLC Control" som nuvarande namn. README-sökvägarna (`:53`) är då oförändrade.
  8. **Fönstertitel**: både `index.html:9` och `index.js:26` måste ändras. `<title>` vinner efter laddning.
  9. **About-panelen**: det utskrivna namnet och taglinen kräver ett nytt fält i `setAboutPanelOptions` (`menu.js:156`). Linux har ingen About-post (`buildMenuTemplate` lägger bara till `role: 'about'` på macOS), så kriteriet "About-panelen visar samma" gäller macOS.
  10. **Splash-kontraktet**: `AuctumMark` ska behålla `role="img"` och namnet "Auctum". `APP_NAME` och `Splash.test.jsx:17` måste följa det nya namnet. Den synliga texten är `aria-hidden`, så skärmläsartexten (`sr-only`) är det som ska bära det fullständiga namnet och taglinen.
  11. **Sidhuvudet**: märkesblocket är 150 px brett och texten saknar kapning. Den nya kortformen ryms troligen precis, men en underrad med det utskrivna namnet ryms inte. Välj en kort underrad (t.ex. "· by Auctum", som US-0406 föreslår) och mät vid 1100 px. `AppShell.test.jsx:122` följer den valda underraden.
  12. **Ingen gemensam namnkälla**: namnet finns i sex kodfiler. En gemensam modul behövs inte för att uppfylla US-0406, men en grep efter "Auctum AIDLC", "Aidlc control" och "aidlc-control" efter bytet är den enkla kontrollen av kriteriet "inget gammalt namn kvar i användartext".
