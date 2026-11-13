# Kodsammanfattning — EPIC-01 Bridge Console MVP

## Skapade filer

- **Konfiguration:** `package.json` (+ `package-lock.json`), `electron.vite.config.mjs`, `vitest.config.mjs`, `electron-builder.yml`
- **Huvudprocess (`src/main/`):**
  - `index.js`: fönster med contextIsolation, sandbox, blockerad navigering och blockerade `window.open`
  - `ipc.js`: namngivna invoke-kanaler med validering av projectId och sökvägar
  - `projectAccess.js`: skrivskyddad läsning, begränsad till projektroten med realpath-kontroll
  - `projectService.js`: identifiering av AI-DLC-projekt, spaces, intent-lista och intentdetaljer med cache av senaste giltiga tillstånd
  - `settings.js`: appens egna inställningar i userData
  - `watcher.js`: chokidar med 300 ms debounce och 800 ms maxväntan, filtrerar `.aidlc-engine/`
  - `pty.js`: node-pty med fliken claude (`$SHELL -l -i -c claude`) och fliken shell (`$SHELL -l`), sessioner per projekt
- **Parsrar (`src/main/parsers/`):** `intents.js`, `state.js`, `runtimeGraph.js`, `audit.js`, `pipeline.js`, `units.js`
- **Preload:** `src/preload/index.js` exponerar `window.bridge` med enbart namngivna funktioner
- **Renderare (`src/renderer/`):** `index.html` (CSP), `main.jsx`, `App.jsx` (projektflikar), `ProjectView.jsx`, `IntentList.jsx`, `IntentDetail.jsx`, `Pipeline.jsx`, `Timeline.jsx`, `BoltDag.jsx` (SVG), `ArtifactReader.jsx`, `TerminalPanel.jsx`, `useProject.js`, `format.js`, `theme.css`
- **Tester:** `tests/main/projectAccess.test.js`, `tests/main/projectService.test.js`, `tests/main/parsers.test.js`, `tests/main/watcher.test.js`, `tests/renderer/IntentList.test.jsx`, fixtures under `tests/fixtures/`

## Ändrade befintliga filer

- `.gitignore`: `node_modules/`, `out/`, `dist/` och `tests/.tmp/`
- `README.md`: avsnitten "Kom igång" och "Säkerhet"
- `docs/features/epic-01-bridge-console-mvp.md`:
  - status per story: 🚧 Byggd, ej releasad
  - besluten Q1–Q4
  - US-0101 omskriven för projektflikar och US-0108 för flikarna claude och shell
  - bockade acceptanskriterier
- `docs/FEATURES.md`: status för EPIC-01

## Viktiga beslut

- Versioner: Electron 45, electron-vite 6, Vite 8, Vitest 5.1, React 19, xterm 6 och node-pty 1.1, ombyggd för Electron.
- chokidar är låst till `^4`, eftersom v5 bara finns som ESM och inte fungerar med main-bundlen som är CommonJS.
- Vitest delar upp miljöerna node och jsdom med `test.projects`, eftersom `environmentMatchGlobs` är borttaget i Vitest 3 och senare.
- Fliken claude startar med `-l -i -c claude`, så att `.zshrc` läses och nvm och `PATH` finns med (FR8.2).
- Watchern har en maxväntan på 800 ms, så att en agent som skriver hela tiden inte kan skjuta upp uppdateringen i det oändliga (NFR1).
- Säkerhetsåtgärder utöver planen:
  - "Öppna i editor" fungerar bara för `.md`, `.json`, `.txt` och `.yaml`/`.yml`.
  - Markdown renderas med `skipHtml`, och länkar och bilder visas som text som inte går att klicka på.
  - Dolda filer i intent-mappar visas inte.
  - Symlänkar som pekar ut ur roten avvisas, och det testas.
- Audit-fixturerna ligger i `tests/fixtures/audit/`. AI-DLC:s skrivskydd för audit-loggen gäller alla `intents/<intent>/audit/`-sökvägar, även fixtures.

## Testtäckning

- 16 enhetstester i 5 filer. Alla gick igenom med `npx vitest run tests/` (kört 2026-11-13).
- Parsrar, projektåtkomst, projekttjänst, watcher och intent-listan har var sitt test för det lyckade fallet, plus tester för fel- och kantfall.

## Tester som inte körts i det här steget

Inga skrivna tester har lämnats okörda. Följande saknar automatiska tester och verifieras manuellt i Build and Test, eftersom de kräver en körande Electron-process:

- pty, mappväljare och IPC
- liveuppdatering i gränssnittet
- tema och kontrast
- `npm run dev` och `npm run build`

## Steg 13 — Auctum-profilering (tillagt 2026-11-13 på användarens begäran)

- **Nya filer:** `src/renderer/AuctumMark.jsx`, `src/renderer/Splash.jsx` och `tests/renderer/Splash.test.jsx`.
  - Loggan är den nya geometriska loggan från `visinv/public/auctum.svg`.
  - Startskärmen visas i minst 900 ms och högst 4 s och tonar ut på 300 ms. Med reducerad rörelse visas den utan animation.
  - Testfilen har 4 tester.
- **Ändrade filer:** `App.jsx` (startskärm, logga och namn i sidhuvudet, logga i tomläget), `theme.css`, `index.html`, `src/main/index.js`, `package.json`, `electron-builder.yml`, `README.md`, `docs/features/epic-01-bridge-console-mvp.md` och `docs/FEATURES.md`.
- **Namn:** Auctum AIDLC Control, med `appId` `se.auctum.aidlc-control`.
- **Inställningsmappen behålls** som `~/Library/Application Support/aidlc-dash`, via `app.setPath('userData', …)` i `src/main/index.js`. Annars hade de sparade flikarna försvunnit när `productName` byttes.
- **Tillgänglighet:** Loggan i sidhuvudet är dekorativ (`aria-hidden`), så namnet läses en gång. På startskärmen och i tomläget har loggan etiketten "Auctum".
- **Tester:** 20/20 gröna (`npx vitest run tests/`), och `npx electron-vite build` går igenom.
- **Inte verifierat här:** startskärmen visuellt i Electron och namnet i den paketerade appen. Det görs i Build and Test.

## Avvikelser från planen och kända problem

- **Disken är full.** Det finns ca 124 MB ledigt. Därför packades Electrons körbara fil inte upp helt i `node_modules/electron/dist`. `npx electron-vite build` går igenom, men `npm run dev`, `npm run build` och manuell test i Electron kräver att du frigör utrymme och sedan kör `node node_modules/electron/install.js`.
- **CSP i dev-läge är inte verifierad.** Om React refresh blockeras av `script-src 'self'` i `npm run dev` behöver CSP:n för dev-läge justeras.
- **Markeringen av nya händelser är ungefärlig.** Den bygger på antal, så en händelse med äldre tidsstämpel från en annan maskin kan markera fel rad.
- **Tidslinjen visar högst 1 500 rader** och är inte virtualiserad. Det är markerat med en `ponytail:`-kommentar.
- **`npm audit`** visar 6 moderata sårbarheter i transitiva dev-beroenden. Inget är åtgärdat.
