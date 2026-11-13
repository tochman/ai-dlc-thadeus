# Kodkvalitet: aidlc-dash

## Snabbbedömning

| Område | Betyg | Kommentar |
|--------|-------|-----------|
| Namngivning | good | Tydliga komponent- och klassnamn, konsekventa `data-testid`; arm och meny delar namngivna funktioner |
| Funktionsstorlek | fair | De flesta funktioner är små; `App` (506 rader, render 325-504), `RefreshPanel`, `SetupAidlc`, `Timeline` och `ProjectContent` är långa men sammanhållna |
| Felhantering | good | IPC-fel loggas i main och visas med `role="alert"`; trasig `settings.json` ger standardvärden; halvskrivna AI-DLC-filer ger förra giltiga värdet; menyns och fönstrets fel loggas på svenska; inga tysta catch utan kommentar |
| Testnärvaro | fair | Main och de flesta stateful vyer testas; `windowOptions`, menymallen, splashen och skalet har egna tester; `createWindow()`, `applyMenu()` (About-panelen), fönsterhändelserna och `useProject` saknar egna tester |
| Duplicering | fair | `errorText()` i över 10 renderarfiler; appnamnet hårdkodat i sex kodfiler och två konfigfiler; två `APP_NAME`-konstanter; `productName` på två ställen; två debounce-implementationer i `watcher.js` (från tidigare skanning) |
| Död kod | good | Inga TODO/FIXME, inga `eslint-disable` i de lästa filerna; `APP_NAME` i `Splash.jsx` exporteras men importeras inte av någon annan fil |

## Tester

- **Ramverk**: Vitest 5 med två projekt (`main` i node, `renderer` i jsdom), Testing Library React.
- **main** (18 filer): `check-glibc`, `configuredModels`, `features`, `git`, `icon`, `ledger`, `menu`, `parsers`, `projectAccess`, `projectService`, `pty`, `ptyPerms`, `questions`, `settings`, `setup`, `theme`, `watcher`, `windowOptions`.
- **renderer** (14 filer): `AppShell`, `CostPanel`, `FeaturesView`, `IntentDetail`, `IntentList`, `ProjectSettingsDialog`, `QuestionPopup`, `RefreshPanel`, `ResumeButton`, `SetupAidlc`, `Splash`, `TerminalPanel`, `Timeline`, `terminalControl`.
- **Coverage**: ingen konfiguration eller tröskel.
- **Körs i CI**: `npx vitest run tests/` i `verify`-jobbet på varje PR mot `main` och på taggar, före båda byggena.

### Tester som bär appens namn (US-0406)

| Test | Rad | Hävdar | Efter bytet |
|------|-----|--------|-------------|
| `tests/main/menu.test.js` | 83 | macOS-menyernas etiketter `['Auctum AIDLC Control', 'Arkiv', …]` | nytt visningsnamn först |
| `tests/main/menu.test.js` | 84 | `'Om Auctum AIDLC Control'` har `role: 'about'` | "Om T.H.A.D.E.U.S." |
| `tests/renderer/Splash.test.jsx` | 16 | `getByRole('img', { name: 'Auctum' })` | oförändrat (märket står kvar) |
| `tests/renderer/Splash.test.jsx` | 17 | `getByText('Auctum AIDLC Control')` (exakt, `sr-only`) | ny `APP_NAME`; en `sr-only`-text med fler delar kräver att testet matchar hela texten eller en del med regex |
| `tests/renderer/AppShell.test.jsx` | 121 | `getByRole('img', { name: 'Auctum' })` inom `banner` | oförändrat |
| `tests/renderer/AppShell.test.jsx` | 122 | `getByText('Aidlc control')` inom `banner` | den nya underraden i märkesblocket |

Inget test hävdar fönstertiteln, `<title>`, About-panelens fält, "Göm …"/"Avsluta …", userData-sökvägen, `appId` eller artefaktnamnen. För en Minimal-strategi räcker det att uppdatera testerna ovan och lägga till en kontroll per nytt krav där en ren funktion finns: `buildMenuTemplate` (Göm/Avsluta-etiketterna), `windowOptions` (`title`) och Splash (utskrivet namn och tagline). About-panelen och paketnamnen kan bara verifieras i en paketerad app eller genom att läsa konfigfilerna.

### Tester som en ändring av gränssnittet kan bryta

Från tidigare skanning (inte omverifierad):

| Test | Beroende |
|------|----------|
| `IntentList.test.jsx` | `.intent-slug` inuti `intent-list-row` |
| `Timeline.test.jsx` | `[aria-posinset]`/`aria-setsize`, `.event.is-new`, `.event-row` med `aria-label`, `.event-fields` |
| `CostPanel.test.jsx` | tabellrader (`closest('tr')`) |
| `FeaturesView.test.jsx` | exakt ett `role="status"`; `h1` i fallback |
| `RefreshPanel.test.jsx`, `ResumeButton.test.jsx` | exakt ett `role="status"` |
| `AppShell.test.jsx` | `role="banner"` för sidhuvudet, `nav` för armen, exakt ett `h1`, armens märke utan `role="img"` |
| Alla renderartester | `data-testid` och svenska etiketttexter |

## Linting, formatering, CI

- Ingen ESLint, Prettier eller EditorConfig i repot. Stilen är ändå enhetlig (2 blanksteg, enkla citattecken, semikolon).
- CI (`.github/workflows/release.yml`): tester på PR mot `main` och på taggar; tagg mot `package.json`-version; macOS- och Linux-bygge; glibc-kontroll; release med `gh release`. Inget lint-steg. Artefaktglobbarna (`dist/*.dmg`, `dist/*.deb`) är oberoende av appnamnet.

## Dokumentation

`README.md` (svenska) beskriver start, Gatekeeper, användning och säkerhet, inklusive inställningssökvägarna. `docs/FEATURES.md` och epic-filer bär krav och acceptanskriterier; `docs/FEATURES.md:1`, `docs/features/epic-01-bridge-console-mvp.md:154` och `docs/features/epic-04-branding-and-desktop.md:7` och `:94` nämner det gamla namnet (grep). Koden har korta kommentarer med krav-ID:n; `src/main/index.js:7` förklarar userData-låset med det gamla namnet.

## Tillgänglighet (befintliga mönster)

- Status alltid med text, aldrig bara färg (`format.js`, `.tag`, `StatusBadge`).
- `:focus-visible`-outline globalt (amber).
- Rörelse: `data-motion` (`full | reduced | off`) med `prefers-reduced-motion` som standard för `reduced`.
- Märket har det tillgängliga namnet "Auctum" (`role="img"`) där det står ensamt (splash, sidhuvud, tomläge) och är `aria-hidden` som dekor (armens fot, terminalens armbåge). Splashens synliga namn är `aria-hidden` med en `sr-only`-text som bär det; sidhuvudets namntext läses upp direkt.
- ARIA i app-skalet: `nav.app-arm[aria-label="Projekt och vyer"]`, `aria-current`, `aria-expanded`, `aria-pressed` på helskärmsknappen, `aria-label` på ⚙ och ×, `role="alert"` på felbannern, `aria-hidden` på dekor.
- Dialoger: native modala `dialog` (`showModal`) med `aria-labelledby`; Esc stänger via `onCancel`; fel i `p.refresh-error[role=alert]`.
- Kontrast: kommentaren i `theme.css:1-6` anger AA för varje ljus/mörk-kombination; namnet står i svart på amber (sidhuvud) och i `--text`/`--steel` på `--bg` (splash). `theme.test.js` finns.

## Risker för US-0406

1. **`appId` på macOS** (`electron-builder.yml:1`): ett nytt bundle id gör appen till en ny app. Dock-fästningen pekar kvar på den gamla, notisbehörigheten (US-0505) måste ges igen och Launch Services ser två appar. Att behålla `se.auctum.aidlc-control` undviker det men lämnar det gamla namnet i ett id som användaren sällan ser. Beslut i kravanalysen.
2. **`productName` på macOS** (`package.json:3`, `electron-builder.yml:2`): `.app`-namnet följer det, så "THADEUS.app" ligger bredvid "Auctum AIDLC Control.app" i Programmappen i stället för att ersätta den. Båda läser samma `aidlc-dash/settings.json`; körs båda samtidigt skriver de i samma fil. Punkter i `productName` ger `.app`- och mappnamn med punkter; kortformen "THADEUS" passar bättre där. Menyradens fetstilta appnamn och Dock visar då "THADEUS", inte "T.H.A.D.E.U.S.", om inte Info.plist får ett eget visningsnamn. Verifieras i en paketerad app.
3. **Gatekeeper**: appen är osignerad och notariseras inte; den nya appen kräver högerklick och Öppna första gången (`README.md:41`).
4. **`.deb`-paketnamnet** (`package.json:2`): `aidlc-dash` → `thadeus` ger ett nytt paket för dpkg. Det gamla blir kvar installerat bredvid (två startposter) om paketet inte deklarerar att det ersätter `aidlc-dash` eller README säger hur det tas bort. Att ändra `name` kräver också `package-lock.json`.
5. **Artefaktnamn och CI**: utan `artifactName` blir `.dmg` `THADEUS-<version>-universal.dmg` bara om `productName` är exakt "THADEUS", och `.deb` `thadeus_<version>_amd64.deb` bara om paketnamnet är `thadeus`. CI-globbarna bryts inte; titeln på `release.yml:91` måste ändras.
6. **Linux-startposten**: `executableName` (`electron-builder.yml:41`) byter binärens, `.desktop`-filens och ikonernas namn; kontrollera att fönstret grupperas under startposten efter bytet.
7. **userData**: `src/main/index.js:8` måste stå kvar oförändrad och före `whenReady`; annars tappar uppgraderade användare öppna projekt, animations-, helskärms- och notisval.
8. **Layout**: märkesblocket i sidhuvudet är 150 px brett med ungefär 84 px för text och saknar kapning (`theme.css:307-322`); den nya kortformen ryms troligen precis, en underrad med det utskrivna namnet gör det inte. Splashens underrad (24 px, 0.18em) radbryts med det utskrivna namnet vid 1100 px (ungefär 840 px mittyta). Båda mäts i Build and Test vid 1100 px och 960 px.

## Teknisk skuld

1. **Appnamnet saknar en gemensam källa**: `Splash.jsx:5`, `menu.js:5`, `index.js:26`, `index.html:9`, `App.jsx:331-334`, `Splash.jsx:50-53`, plus `productName` på två ställen och `release.yml:91`.
2. **Inga uttryckliga `artifactName`** i `electron-builder.yml`; filnamnen beror på `productName` och `name`.
3. **`.app-brand-text` saknar kapning** (`theme.css:321`), till skillnad från `.lcars-label` och `.app-title`.
4. **About-panelen** har bara namn och version (`menu.js:156`); varken den eller `applyMenu` testas.
5. **Ingen fönsterreferens i main**: `createWindow()` håller `win` lokalt; `ipc.js`, `menu.js` och `notify.js` slår upp fönstret per anrop.
6. **Terminalstyrningen** (`useTerminal()`) finns bara inne i varje `ProjectView`; App når den bara via `terminalCommand`.
7. `settings.js` vitlistar nycklar; en ny inställning kräver ändring i `sanitize()`.
8. Två debounce-implementationer i `watcher.js` (från tidigare skanning).
9. Bevakningen gäller en space per projekt; händelser i andra spaces syns inte (från tidigare skanning).
10. Färger utanför tokens: fönsterbakgrunden i `windowOptions()` är en litteral som matchar `--bg` (`#05060a`). Dialogernas `::backdrop` använder nu `--backdrop`; banners och `flash` är inte omverifierade.
11. `hidden` sätter `display: none !important` (`theme.css:60`), så in/ut-övergångar på dolda flikar och projekt kräver annan teknik.

Tidigare skuldpunkter som US-0505 tog hand om (att audit bara lästes för den valda intenten, ingen fokus- eller notislogik, `runTerminal` bunden till det aktiva projektet för "Svara i Claude") är åtgärdade enligt `App.jsx` (`answerInClaude`, `setActiveProject`) och `notify.js`; själva logiken i `questions.js` och `notify.js` är inte djupläst.
