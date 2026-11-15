# Testresultat — Build and Test

Körda 2026-11-13 på macOS (x86_64), Node 22.14 och Electron 45.3.1.

## Bygg

| Kommando | Exit | Resultat |
|----------|------|----------|
| `rm -rf node_modules/electron/dist && node node_modules/electron/install.js` | 0 | Electron-binären installerades färdigt efter att diskutrymme frigjorts |
| `npx electron-vite build` | 0 | `✓ 281 modules transformed`, `✓ built`. Renderer-bundlen är 1,6 MB. |
| `npm run build` | 0 | Electron-vite-bygget, node-pty ombyggd för x64, `skipped macOS code signing (identity null)`, `dist/aidlc-dash-0.1.0.dmg` (130 MB) |

## Enhetstester

Kommando från `construction/code-generation/unit-test-instructions.md`, kört en gång:

```
npx vitest run tests/main/projectAccess.test.js tests/main/projectService.test.js tests/main/parsers.test.js tests/main/watcher.test.js tests/renderer/IntentList.test.jsx
```

| Filer | Tester | Godkända | Misslyckade | Överhoppade | Exit |
|-------|--------|----------|-------------|-------------|------|
| 5 | 16 | 16 | 0 | 0 | 0 |

- Miljö: Node för `tests/main/**` och jsdom (DOM-emulator) för `tests/renderer/**`.
- Täckning: inget täckningsgolv i express/Minimal, så ingen täckningsrapport togs fram.

## Kontroller i riktig Electron (Chromium-renderare)

Ett tillfälligt kontrollskript startade den byggda appen (`out/main/index.js`) i Electron. Det öppnade `a reference project` och aidlc-dash som flikar, styrde gränssnittet via DOM och `window.bridge` och återställde sedan inställningarna. Skriptet låg under `tests/.tmp/` och är borttaget.

| Kontroll | Resultat |
|----------|----------|
| Konsolfel i renderaren | 0 |
| `webPreferences` | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` |
| `typeof require` i renderaren | `undefined` |
| `window.bridge` | 19 namngivna funktioner, ingen generisk invoke |
| Flikar återställda från inställningar (FR1.4, FR1.5) | `["a reference project","aidlc-dash"]` |
| Intent-lista (FR2) | 23 + 1 rader. Första raden är t.ex. `epic29-status-order complete express 2026-11-12 8/10`. |
| Fritextsökning "epic02" (FR2.4) | Bara `epic02-finish` visas i a reference project-fliken |
| Pipeline för epic02-finish (FR3) | 33 stages per flik med status, agent och tider, t.ex. `workspace-scaffold Klar orchestrator … 0 s` |
| Tidslinje (FR4) | 868 händelser synliga med brusfiltret på, av 1 726 totalt |
| Bolt-DAG (FR5) | SVG renderad med 6 units |
| Sökväg utanför roten (FR10.2) | `readFile(…, '../../../etc/passwd')` avvisades med "Sökvägen ligger utanför projektroten" |
| Pty i shell-fliken (FR8.1–FR8.3) | `echo SMOKE_$((40+2)); pwd` gav `SMOKE_42` och projektroten som cwd |
| Terminalflikar och snabbknappar (FR8.1, FR8.5) | Flikarna claude och shell finns i varje projekt, och knapparna `/aidlc --status`, `/aidlc --doctor` och `/aidlc continue` finns |
| `PATH` i inloggningsskalet under Electron (FR8.2) | `-l -i -c` hittar `~/.nvm/…/bin/claude` och `~/.local/bin/aidlc`, och `COLUMNS` följer pty-storleken (100) |
| Paketerad app (`dist/mac/aidlc-dash.app`) | Startar och körs i 7 s utan fel i loggen. `pty.node` och `spawn-helper` ligger i `app.asar.unpacked`. |

## NFR-mätningar

| Mätning | Metod | Resultat |
|---------|-------|----------|
| Ladda intent-listan för a reference project (23 intents) | `detectProject` + `loadIntentList` i Node | 30 ms |
| Ladda den största intentens detaljer (epic02-finish, 1 726 audit-händelser) | `loadIntentDetail` i Node | 30 ms |
| Tid från filändring till `onChange` | `watchIntents` på en temporär mapp i Node | 314 ms (debounce 300 ms, maxväntan 800 ms) |
| Kontrast i temat | WCAG-formeln på färgerna i `theme.css` | Lägst 6,61:1 (röd på panel-2). Brödtext 13,94–16,40:1, dämpad text 7,07–8,32:1. |

## Inte verifierat automatiskt

Dessa kräver en människa vid skärmen. De står också som kända begränsningar i summeringen och ingår inte i målmatrisen:

- Den inbyggda mappväljaren (`dialog.showOpenDialog`). IPC-vägen bakom den (`project:open`) är verifierad.
- Att svara på en riktig AI-DLC-gate interaktivt i claude-fliken. Pty-, tangent- och storleksvägen är verifierad i shell-fliken.
- Att `prefers-reduced-motion` stänger av animationer i praktiken. Det finns en mediaregel i `theme.css`.

## Omkörning efter Auctum-profileringen (steg 13)

| Kontroll | Resultat |
|----------|----------|
| `npx vitest run tests/` | 6 filer och 20 tester, alla gröna, exit 0. 4 nya tester i `tests/renderer/Splash.test.jsx` (jsdom). |
| `npx electron-vite build` | Exit 0 |
| `npm run build` | Exit 0. `dist/Auctum AIDLC Control-0.1.0.dmg` och `dist/mac/Auctum AIDLC Control.app` byggdes. `CFBundleName` är "Auctum AIDLC Control" och `CFBundleIdentifier` är `se.auctum.aidlc-control`. Signeringen hoppades över (osignerad). |
| Startskärm i riktig Electron (Chromium) | 250 ms efter laddning visas startskärmen med Auctum-loggan (role img, "Auctum") och texten "AUCTUM AIDLC CONTROL". Efter 4,6 s är den borta. En skärmbild togs och kontrollerades visuellt. |
| Fönstertitel och sidhuvud | Titeln är "Auctum AIDLC Control". `<h1>` innehåller loggan och namnet. En skärmbild togs och kontrollerades visuellt. |
| Inställningsmapp | `userData` är fortfarande `~/Library/Application Support/aidlc-dash`, så sparade flikar återställdes efter namnbytet. |
| Claude-fliken | Startade en riktig `claude`-session i projektroten, som syns på skärmbilden. |
| Konsolfel i renderaren | 0 |
| Loggan i tomläget | Kontrollerades inte vid körningen, eftersom en sparad flik var öppen och tomläget därför inte visades. Elementet finns i `App.jsx`. |

## Fel

Inga.
