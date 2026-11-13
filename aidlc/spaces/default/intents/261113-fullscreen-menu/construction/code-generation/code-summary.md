# Kodsammanfattning — EPIC-04 US-0404 Helskärm och egen appmeny

Alla fem stegen i `code-generation-plan.md` är byggda och avbockade. Inga nya beroenden. CSP är oförändrad, och appen skriver fortfarande bara sin egen `settings.json`.

## Per steg

### Steg 1 — Helskärm i main (FR1.1, FR1.3)
- `src/main/settings.js`: `sanitize()` behåller `fullscreen` när värdet är en boolean och utelämnar annars nyckeln, på samma sätt som `animations`.
- `src/main/index.js`:
  - `createWindow()` är nu asynkron. Den läser `getSettings()` och skapar fönstret med `fullscreen: settings.fullscreen === true` och `autoHideMenuBar: true`.
  - Lyssnarna på `enter-full-screen` och `leave-full-screen` gör tre saker: sparar `fullscreen` via settings-kön, skickar `window:fullscreen` till renderaren och bygger om menyn.
  - Fönsterreferensen som `createWindow()` returnerar skickas till `applyMenu`.
- `src/main/ipc.js`: `window:toggleFullscreen` och `window:isFullscreen` arbetar med avsändarens fönster (`BrowserWindow.fromWebContents`).
- `src/preload/index.js`: `toggleFullscreen()`, `isFullscreen()` och `onFullscreen(cb)`.

### Steg 2 — Appmenyn (FR2.1, FR2.2, FR2.3, FR2.6, NFR1)
- Ny fil `src/main/menu.js`:
  - `buildMenuTemplate({ isMac, isPackaged, state, fullscreen, send, actions })` är ren och testas utan Electron.
  - `parseMenuState(raw)` godtar bara `{ hasProject, isAidlc, showFeatures }` som booleaner. Allt annat ger `null`, och payloaden ignoreras då.
  - `setMenuState()` och `applyMenu(win)` bygger menyn med `Menu.setApplicationMenu`. `app.setAboutPanelOptions` sätts med namn och version.
- Menyns innehåll:
  - **macOS appmeny:** Om (`role: 'about'`), Inställningar… (`CmdOrCtrl+,`), Göm, Göm övriga, Visa alla, Avsluta.
  - **Arkiv:** Öppna projekt… (`CmdOrCtrl+O`), Stäng projekt (`CmdOrCtrl+W`), Projektinställningar…. På Linux även Inställningar… och Avsluta (`Ctrl+Q`).
  - **Redigera:** rollerna `undo`, `redo`, `cut`, `copy`, `paste` och `selectAll`.
  - **Visa:** Intents, Features, Kostnad, Github, Helskärm (en `checkbox` med `Ctrl+Cmd+F` på macOS och `F11` på Linux) samt zoom.
  - **Terminal:** Claude, Shell, Starta om flik.
  - **Fönster** (bara macOS, `role: 'windowMenu'`).
  - **Hjälp:** AI-DLC-dokumentation och Rapportera problem.
  - **Utveckling** (bara när `!app.isPackaged`).
- Aktivering:
  - Projektposterna i Arkiv, Visa och Terminal kräver `hasProject`.
  - Kostnad och Github kräver `isAidlc`.
  - Features visas bara när `showFeatures` är sant.
- Allt som rör innehållet skickar `menu:command` med `{ command, ...args }` till fokuserat fönster.
- `src/main/ipc.js`:
  - `menu:state` validerar payloaden, sparar läget och bygger om menyn.
  - `app:openDocsUrl` öppnar den fasta adressen `AIDLC_DOCS_URL` med `shell.openExternal`.
- `src/main/index.js` anropar `applyMenu(null)` när appen är redo och sedan `applyMenu(win)` när fönstret finns.
- Preload: `sendMenuState`, `onMenuCommand` och `openDocsUrl`.

### Steg 3 — En kodväg i renderaren (FR2.4, FR2.5, FR2.6)
- `src/renderer/App.jsx`: armens inline-lambdor är nu namngivna funktioner, och både armen och menyn anropar dem:
  - `openProject` (tidigare `addProject`)
  - `closeActiveProject`
  - `showView`
  - `togglePanel`
  - `openAppSettings`
  - `openProjectSettings`
  - `runTerminal`
  - `openDocs`
- En `useEffect` prenumererar på `onMenuCommand`. Den slår upp kommandot i en tabell via en ref, så att den alltid använder det senaste tillståndet. Okända kommandon och okända argument ignoreras.
- En `useEffect` skickar `sendMenuState({ hasProject, isAidlc, showFeatures })` när värdena ändras.
- Terminal: App skickar `terminalCommand` (`{ seq, action, projectId }`) till alla `ProjectView`. I `src/renderer/ProjectView.jsx` reagerar bara den vy vars `projectId` matchar:
  - `claude` eller `shell` ger `terminal.show(tab)`
  - `restart` ger `terminal.restart(aktiv flik)`
- Docs:
  - Har projektet en `docs/README.md` läses den med `bridge.readFile` och visas i den nya `src/renderer/DocsDialog.jsx`, som använder artefaktläsarens `FileContent` (Markdown utan rå HTML).
  - Annars, eller utan öppet projekt, anropas `app:openDocsUrl`.

### Steg 4 — Helskärmsknappen (FR1.2, FR1.4, NFR3)
- `App.jsx`: en `button.lcars-block` sitter sist i `.app-header-row`, efter dekoren.
  - Den har `data-testid="fullscreen-toggle"` och `aria-pressed`.
  - Etiketten är "Helskärm" eller "Lämna helskärm".
  - Läget läses med `isFullscreen()` vid start och uppdateras via `onFullscreen`.
- `theme.css`: `.app-fullscreen` sträcker sig över hela radens höjd och har en egen fokusram i `--amber`. `.docs-dialog` begränsar höjden och rullar. Bara tokens används, så `theme.test.js` är fortfarande grön.

### Steg 5 — Tester
- `tests/main/menu.test.js` (4 nya tester):
  - paketerad app mot dev
  - avstängda poster och `parseMenuState`
  - `CmdOrCtrl+W` och kommandona
  - macOS mot Linux
- `tests/main/settings.test.js`: +1 test för `fullscreen`.
- `tests/renderer/AppShell.test.jsx`: +2 tester:
  - helskärmsknappens etikett och `aria-pressed`
  - menykommandon (`view: features`, `appSettings`, okända kommandon, `docs` utan README och `closeProject` med och utan projekt) samt `sendMenuState`
- `mockBridge` har fått de nya bridge-metoderna. De befintliga förväntningarna är oförändrade.

## Viktiga beslut
- `menu:state` och `app:openDocsUrl` är invoke-kanaler i den befintliga `handlers`-tabellen, så de får samma felloggning som övriga kanaler. `menu:command` och `window:fullscreen` går bara från main till renderaren.
- `window:toggleFullscreen` returnerar inget läge. På macOS är bytet animerat, så knappen uppdateras först när main skickar `window:fullscreen`. Det gör att knappen alltid visar det verkliga läget.
- `terminalCommand` bär `projectId` och skickas till alla flikar. På så sätt kör en flik som byts fram eller monteras aldrig ett gammalt kommando.
- `togglePanel` gör ingenting utan aktivt AI-DLC-projekt. Armknapparna är redan avstängda i det läget, så armens beteende är oförändrat.

## Avvikelser från planen
- Planen säger "spara fönsterreferensen". Ingen modulvariabel används, eftersom referensen bara behövs för `applyMenu`. `createWindow()` returnerar fönstret, och det skickas vidare dit.
- Terminalvalen anropar `terminal.show(tab)` i stället för `setView` direkt. `show` gör samma `setView({ open: true, active })` och sätter dessutom fokus på fliken.
- Läsaren för `docs/README.md` är en egen dialog (`DocsDialog.jsx`) som återanvänder artefaktläsarens rendering (`FileContent`). `ArtifactReader` är knuten till en intents filträd och kan inte visa en fil från projektroten.
- Menyn "Utveckling" har också Force Reload ("Tvinga omladdning"), som också hör till dev-läget.

## Resultat
- `npx vitest run tests/`: 29 filer och 97 tester, alla gröna (90 befintliga och 7 nya).
- `npx electron-vite build`: bygget lyckades.

## Kvar till Build and Test (manuellt i riktig Electron)
- Kontrollera menyns innehåll på macOS och Linux.
- Slå på och av helskärm, och kontrollera att läget finns kvar efter omstart. Kontrollera särskilt att stängning i helskärm inte ger `leave-full-screen`, så att `false` sparas.
- Kontrollera att `Cmd+W` stänger projektet och att posterna är avstängda utan projekt.
- Kontrollera ramarna vid 2560 × 1440 (FR1.4).
- På Linux tar menyns `Ctrl+W` över `Ctrl+W` i terminalen (radera ord i skalet), eftersom kravet FR2.6 kräver `CmdOrCtrl+W`.

## Loop-back 1 (F-01)
- Orsak: `fullscreen: false` i fönstrets options stängde av helskärm helt på macOS (`isFullScreenable()` blev false). Därför gjorde knappen, menyposten och `Ctrl+Cmd+F` ingenting.
- `src/main/index.js`: fönstrets options ligger nu i den rena exporterade funktionen `windowOptions(settings, platform)`. Den sätter alltid `fullscreenable: true` och tar bara med `fullscreen: true` när `settings.fullscreen === true`. `createWindow()` anropar den. Inget annat är ändrat.
- Nytt test `tests/main/windowOptions.test.js` (4 tester): inget sparat läge, `false` eller ogiltigt värde ger ingen `fullscreen`-nyckel och `fullscreenable: true`; sparat läge ger `fullscreen: true`; ikonen sätts bara på Linux. Testet stubbar `electron`, `ipc.js`, `menu.js` och `settings.js`, eftersom `index.js` startar appen vid import.
- Stängning i helskärm: verifieringen visade att `true` står kvar efter stängning (`settingsAfterClose: true`). Någon spärr mot `leave-full-screen` vid stängning behövdes inte och lades inte till.
- Resultat: `npx vitest run tests/` gav 30 filer och 101 tester, alla gröna. `npx electron-vite build` lyckades. I riktig Electron (macOS): `isFullScreen` true, knappen visar "Lämna helskärm" med `aria-pressed` true, menyns bock är satt, `settingsFs` true. Efter omstart startar appen i helskärm (`isFullScreenAtStart` true), och knappen lämnar helskärm (`isFullScreenAfterToggle` false).
