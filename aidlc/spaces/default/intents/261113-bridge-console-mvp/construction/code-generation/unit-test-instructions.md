# Instruktioner för enhetstester — Bridge Console MVP

## Ramverk och konfiguration

- **Vitest** (`vitest.config.mjs` i projektroten). Miljön är `node` för `tests/main/**` och `jsdom` för `tests/renderer/**`. Uppdelningen görs med `test.projects`, eftersom Vitest 3 och senare (här 5.1) har tagit bort `environmentMatchGlobs`.
- `@testing-library/react` används för renderartesterna.
- Testerna kräver ingen Electron-process, eftersom parsrar, projektåtkomst och watcher är rena Node-moduler.

## Körning

Kommandot fungerar så fort steg 2 i planen är klart, och det kör bara den här leveransens testkataloger:

```bash
npx vitest run tests/main/projectAccess.test.js tests/main/projectService.test.js tests/main/parsers.test.js tests/main/watcher.test.js tests/renderer/IntentList.test.jsx tests/renderer/Splash.test.jsx
```

Ett enskilt lager kan köras med respektive fil, till exempel `npx vitest run tests/main/parsers.test.js`.

## Omfång (Minimal-strategi)

Det blir ungefär 14 tester. I listan står kravet som varje test verifierar:

- `projectAccess.test.js` (3):
  - sökväg inom roten (lyckat fall)
  - `..` och absolut sökväg avvisas (FR10.2)
  - trasig JSON ger `ok:false` (FR7.4)
- `projectService.test.js` (2):
  - AI-DLC-projekt känns igen (FR1.2)
  - vanlig mapp ger `isAidlc:false` (FR1.2)
- `parsers.test.js` (7):
  - intent-ordning och markering av intents som saknas (FR2.1, FR2.5)
  - state-parsern (FR3.1, FR3.2)
  - state vinner med markerad avvikelse (FR3.4)
  - pipeline utan runtime-graph (FR3.5)
  - audit med okända typer och fält (FR4.1, FR4.6)
  - sammanslagning av audit-filer (FR4.2)
  - unit-status från DAG och audit (FR5.2)
- `watcher.test.js` (1): debounce per intent och ignorerad `.aidlc-engine/` (FR7.1, FR7.2)
- `IntentList.test.jsx` (1–2): filtrering och sökning (FR2.4), status som text (FR9.3)
- `Splash.test.jsx` (1–2): startskärmen visar Auctum-loggan och namnet "Auctum AIDLC Control", och den döljs när appen är klar (US-0109, Auctum-profilering)

## Täckningsmål

Express-scope och Minimal-strategi har inget golv för radtäckning. Varje komponent med logik (projectAccess, projectService, parsrar, watcher, IntentList) har minst ett test för det lyckade fallet.

## Mockning och stubbar

- Filsystem: inga mockar. Testerna läser riktiga fixtures under `tests/fixtures/project/`.
- Watcher-testet skapar en temporär kopia av en fixture-intent under `tests/.tmp/` (skapas och tas bort av testet, git-ignorerad) och skriver en fil där.
- `IntentList.test.jsx` får sin data som props och behöver inte `window.bridge`.

## Testdata

- `tests/fixtures/project/` är en nedkortad kopia av AI-DLC-filer från `a reference project`. Maskinnamn byts mot `machine-a`/`machine-b` och beställningstexter kortas ner.
- Audit-fixturerna (`machine-a.md`, `machine-b.md` och `epic02-units.md`) ligger i `tests/fixtures/audit/` och inte i intent-mapparnas `audit/`. AI-DLC:s audit-skydd tillåter bara ramverkets egna verktyg att skriva filer under en `intents/<intent>/audit/`-sökväg, även i testfixturer. Parsertesterna läser filerna direkt därifrån.
- Fixtures ändras aldrig av testerna.

## Manuell verifiering (Electron-beroende, i Build and Test)

- Mappväljare och flikar (FR1.1, FR1.4, FR1.5)
- Terminalflikarna claude och skal, med `PATH`/`aidlc` tillgängliga, storleksändring, snabbknappar, omstart och att processerna avslutas när fliken stängs (FR8)
- Liveuppdatering mot `a reference project` medan en workflow kör (FR7.3, NFR1)
- Tema, kontrast och `prefers-reduced-motion` (FR9, NFR3)
- `npm run build` ger en osignerad `.app`/`.dmg` (FR10.4)
