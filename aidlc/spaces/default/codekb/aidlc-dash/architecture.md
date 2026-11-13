# Arkitektur: aidlc-dash

## Architecture Analysis

### System Overview

En Electron-app med tre processdelar som electron-vite bygger till `out/`, paketerad av electron-builder till `dist/`:

- **Huvudprocessen** (`src/main/`): låser userData till mappen `aidlc-dash`, skapar fönstret (`windowOptions()`), sätter en egen appmeny och About-panel (`menu.js`), läser AI-DLC-filer inom öppnade projektrötter, bevakar dem med chokidar, härleder väntande frågor och visar systemnotiser (`questions.js`, `notify.js`, US-0505), kör `git` och `aidlc` med fasta argument, äger pseudoterminalerna (node-pty) och skriver appens `settings.json`.
- **Preload** (`src/preload/index.js`): exponerar ett smalt, namngivet `window.bridge`-API via `contextBridge`. Inget generiskt `invoke` eller `send`.
- **Renderaren** (`src/renderer/`): en React 19-SPA i ett sandboxat fönster (`contextIsolation`, ingen `nodeIntegration`, `sandbox`, CSP i `index.html`). Utseendet styrs av den globala stilmallen `theme.css` med tokens, LCARS-primitiver i `Lcars.jsx` och ett rörelseläge som `App.jsx` sätter som `data-motion` på `<html>`.
- **Paketering** (`package.json`, `electron-builder.yml`, `.github/workflows/release.yml`): ger appens identitet i operativsystemet (`appId`, `productName`, `executableName`, artefaktnamn) och publicerar `.dmg` och `.deb` på tagg.

### Architectural Style

Monolitisk skrivbordsapp med strikt processgräns: renderaren gör inga fil- eller processanrop själv, allt går via IPC (`ipcMain.handle` / `ipcRenderer.invoke`) och push-händelser (`webContents.send` / `ipcRenderer.on`). Tillstånd hålls i React (App-skalets state per projekt, hooks, en terminal-context per projekt) och i main-processens cacher per projekt. Inga externa tjänster eller nätverks-API:er.

### Component Relationships

App-skalets layout (verifierad i `App.jsx`; innehållet i `.project-pane` är från tidigare skanning):

```mermaid
flowchart TB
  subgraph Window["BrowserWindow 1440x900 (min 960x600), bakgrund #05060a, titel från index.html"]
    Splash["Splash (overlay): AuctumMark 300 + namn"]
    subgraph AppShell[".app"]
      Header["header.app-header: .app-brand (AuctumMark 46 + namntext), Bar, Gren, h1.app-title, Helskärm"]
      Arm["nav.app-arm: projektblock, + Öppna, vyer, Kostnad, Github, Inställningar, arm-foot"]
      Banner[".banner.banner-error.app-error (valfri)"]
      subgraph Main["main.app-main > .project-pane (en per projekt, dolda med hidden)"]
        PV["ProjectView (vy, paneler, IntentDetail, TerminalPanel, ProjectSettingsDialog)"]
      end
    end
    AppDlg["AppSettingsDialog (modal: Animationer, Frågor och notiser)"]
    DocsDlg["DocsDialog (modal, docs/README.md)"]
    QPop["QuestionPopup (modal, väntande frågor)"]
  end
  Arm -- "setActiveId / showView / togglePanel / openProjectSettings" --> PV
  Arm -- "openAppSettings" --> AppDlg
  MenuCmd["menu:command"] -- "menuCommands (vitlistade)" --> AppShell
  QPop -- "answerInClaude: setActiveId + terminalCommand claude" --> PV
  AppShell -- "terminalCommand {seq, action, projectId}" --> PV
```

Text: fönstret har splash-overlayn, app-skalet och tre modala dialoger. Skalet har ett sidhuvud (märkesblocket med Auctum-märket och appnamnet, dekorstapel, gren, titel, helskärmsknapp), en vänsterarm av LCARS-block och huvudytan med en monterad `ProjectView` per projekt. Armen och menykommandon kör samma namngivna funktioner; terminalkommandon och "Svara i Claude" når rätt projekt via `terminalCommand`.

Processer och moduler:

```mermaid
flowchart LR
  subgraph Renderer
    App --> ProjectView
    App --> AppSettingsDialog
    App --> DocsDialog
    App --> QuestionPopup
    App --> Splash
    ProjectView --> useProject
    ProjectView --> useFeatures
    ProjectView --> TerminalContext
    TerminalPanel --> TerminalContext
  end
  Preload["preload: window.bridge"]
  subgraph MainProc["Main"]
    Entry["index.js: userData, windowOptions, createWindow"] --> IPC["ipc.js"]
    Entry --> Menu["menu.js: meny + About"]
    IPC --> Menu
    IPC --> PS["projectService"]
    IPC --> W["watcher"]
    IPC --> Q["questions / notify"]
    IPC --> PTY["pty"]
    IPC --> G["git"]
    IPC --> S["setup / models"]
    IPC --> F["features"]
    IPC --> ST["settings"]
    Entry --> ST
    PS --> PA["projectAccess"]
    PS --> P["parsers/*"]
  end
  App --> Preload
  useProject --> Preload
  useFeatures --> Preload
  TerminalPanel --> Preload
  Preload --> IPC
  W -- "project:changed" --> Preload
  Q -- "questions:changed / questions:focus" --> Preload
  PTY -- "pty:data / pty:exit" --> Preload
  Menu -- "menu:command" --> Preload
  Entry -- "window:fullscreen" --> Preload
```

Text: App, hooks och terminalpanelen anropar `window.bridge`, som går till `ipc.js`. `index.js` låser userData, skapar fönstret, registrerar IPC och sätter menyn. IPC delegerar till projectService (via projectAccess och parsers), watcher, frågor och notiser, pty, git, setup/models, features, settings och menu. Watcher, frågorna, pty, menyn och fönstrets helskärmshändelser skickar push-händelser tillbaka till renderaren. `ipc.js` importerar `notifyQuestions` från `notify.js` (skummat); `index.js` gör det inte.

Var appens namn och identitet kommer ifrån (US-0406):

```mermaid
flowchart LR
  PJ["package.json: name aidlc-dash, productName"] --> EB["electron-builder"]
  EBY["electron-builder.yml: appId, productName, executableName"] --> EB
  EB --> MacApp[".app: CFBundleName, CFBundleIdentifier, Dock, Finder"]
  EB --> DMG["dmg-filnamn (standardmönster)"]
  EB --> Deb["deb-paket och filnamn, .desktop Name, binär"]
  RW["release.yml: --title"] --> GHR["GitHub Release"]
  DMG --> GHR
  Deb --> GHR
  HTML["index.html: title"] --> WinTitle["fönstertitel"]
  IDX["index.js: title, userData aidlc-dash"] --> WinTitle
  IDX --> UD["settings.json i aidlc-dash"]
  MENU["menu.js: APP_NAME"] --> MacMenu["appmeny: Om / Göm / Avsluta, About-panel"]
  SPL["Splash.jsx: APP_NAME + dekortext"] --> SplashUI["splash"]
  APPJ["App.jsx: app-brand-text"] --> HeaderUI["sidhuvudets märkesblock"]
```

Text: paketidentiteten (bundle, Dock, filnamn, deb-paket, Linux-startpost) kommer från `package.json` och `electron-builder.yml` via electron-builder. Releasetiteln kommer från `release.yml`. Fönstertiteln sätts i `index.js` och skrivs över av `<title>` i `index.html`. Menyn och About-panelen tar namnet från `APP_NAME` i `menu.js`; splashen och sidhuvudet har egna strängar. userData är fastlåst i `index.js` och påverkas inte av något av namnen.

### Data Flow

1. Vid modulladdning låser main userData till `<appData>/aidlc-dash` (`index.js:8`), före `whenReady`. Vid start sätter main menyn (`applyMenu(null)`, som också sätter About-panelens namn och version), läser inställningarna och skapar fönstret med `windowOptions(settings)`. App läser inställningarna (`settings:get`), sätter rörelseläget och notisvalen och öppnar sparade projekt igen (FR1.5). Splash visas tills återställningen är klar (minst 900 ms, högst 4 s).
2. Personen öppnar en mapp (`project:pick`, `project:open`). Main validerar roten (`openRoot`, realpath), detekterar AI-DLC och startar bevakning av projektets aktiva space (`watchSpace`). Varje öppet projekt bevakas, inte bara det aktiva.
3. `useProject` hämtar intent-lista, vald intents detalj, kostnad och modeller. Listan bygger på `intents.json`, mappar på disk, `active-intent` och varje intents `aidlc-state.md`; detaljen slår ihop `aidlc-state.md`, `runtime-graph.json`, alla audit-shards och artefaktfiler.
4. chokidar-ändringar under `intents/` debouncas (300 ms, max 800 ms) och skickas som `project:changed` till det `webContents` som öppnade projektet. Main uppdaterar också väntande frågor för alla öppna projekt och skickar `questions:changed`; nya frågor öppnar popupen och, enligt `questionAlerts` och vilket projekt som visas (`questions:activeProject`), en systemnotis. Klick på notisen skickar `questions:focus`.
5. Terminalens in- och utdata går via `pty:write` och `pty:data`. Aktivitetssignalen (`idle | busy | exited`) räknas i renderaren (`terminalControl.js`).
6. Efter varje flikändring sparar App `openProjects`, `recentProjects` och `activeProject`; animationsläget sparas som `animations`, notisvalen som `questionAlerts` och `notificationSound`; main sparar `fullscreen` vid `enter-/leave-full-screen`. Allt går genom `settings.js` seriella skrivkö och `sanitize()`.

### Key Design Decisions

- **Skrivskyddad mot AI-DLC**; den enda fil appen skriver är `settings.json` i userData.
- **userData fastlåst till `aidlc-dash`** (`index.js:7-8`): sedan förra namnbytet följer mappen inte `productName`, så inställningar överlever namnbyten. Alternativ som inte valts: Electrons standard (en mapp per `productName`), som skulle tömma inställningarna vid varje namnbyte. Följd för US-0406: inget migreringssteg behövs så länge raden står kvar.
- **Namnet har ingen gemensam källa**: `productName` finns i `package.json` och `electron-builder.yml`, visningsnamnet i `menu.js` (`APP_NAME`), `Splash.jsx` (`APP_NAME`), `index.js` (fönstertitel) och `index.html` (`<title>`), och den synliga märkestexten är egna strängar i `Splash.jsx` och `App.jsx`. Följd: ett namnbyte rör sex kodfiler, två konfigfiler, CI, README och tre tester.
- **Inga uttryckliga artefaktnamn**: `electron-builder.yml` saknar `artifactName`, så `.dmg` heter `${productName}-${version}-${arch}.dmg` och `.deb` `${name}_${version}_${arch}.deb` (electron-builders standard). CI-globbarna (`dist/*.dmg`, `dist/*.deb`) beror bara på filändelsen.
- **Rotbegränsad filåtkomst** (`resolveInRoot` avvisar absoluta sökvägar, `..` och symlänkar ut ur roten).
- **Smalt preload-API**: varje kanal är en namngiven funktion (`call(channel)` eller `subscribe(channel)`). Alternativ som inte valts: ett generiskt `invoke(channel, ...)`.
- **Generisk auditparser**: varje `**Nyckel**: värde`-rad sparas ordagrant i `fields`; bara `Timestamp` och `Event` lyfts ut.
- **App-skalet äger UI-tillståndet per projekt** (`ui[projectId] = {view, cost, github}`) och skickar det som props till `ProjectView`. Menykommandon och armens knappar delar namngivna funktioner (`openProject`, `closeActiveProject`, `showView`, `togglePanel`, `openAppSettings`, `openProjectSettings`, `runTerminal`, `openDocs`).
- **Terminalen styrs per projekt**: `TerminalProvider` ligger i varje `ProjectView`; App når den via propen `terminalCommand {seq, action, projectId}`. "Svara i Claude" (`answerInClaude`) sätter `projectId` direkt.
- **Allt utseende i en global CSS-fil** med tokens på `:root`, kompletterad av `tokens.js` och `Lcars.jsx`. Alternativ som inte valts: CSS-moduler eller CSS-in-JS. Märkesblocket och splashen har fasta mått (150 px respektive 180 px arm), så längre text måste få plats inom dem.
- **Alla flikar monterade**: dolda projekt och terminaler ligger kvar (`hidden`) så sessioner överlever flikbyten (FR8.4).
- **Rörelse styrs globalt**: `data-motion` (`full | reduced | off`) på `<html>`, satt i `useLayoutEffect` före första målning.
- **Egen meny och helskärm** (US-0404): `menu.js` bygger mallen olika för paketerat och dev (ren `buildMenuTemplate`, testad), tar emot `menu:state` och skickar `menu:command` till fokuserat fönster. macOS-appmenyn och About-panelen tar namnet från `APP_NAME`; Linux har ingen About-post.
- **Ingen fönsterreferens på modulnivå**: main slår upp fönstret per anrop.

Säkerhet: CSP tillåter `style-src 'self' 'unsafe-inline'` och `font-src 'self' data:`, så nya typsnitt måste bundlas lokalt. Fönstret blockerar navigering och nya fönster; `http(s)`-länkar öppnas i OS-webbläsaren. Appen är osignerad (`identity: null`) och notariseras inte, så Gatekeeper kräver högerklick och Öppna första gången. Ett nytt `appId` gör appen till en ny app för macOS (notisbehörighet, Dock-fästning). Namnbytet ändrar inga säkerhetskontroller.

### Improvement Opportunities

- Samla visningsnamnet, det utskrivna namnet och taglinen på ett ställe som både main (`menu.js`, `index.js`) och renderaren (`Splash.jsx`, `App.jsx`) kan importera (som `parsers/` redan delas), eller åtminstone låt main och renderaren ha var sin konstant och kontrollera med grep att det gamla namnet är borta.
- Sätt `artifactName` för `dmg` och `deb` uttryckligen i `electron-builder.yml`, så att filnamnen (`THADEUS-<version>-universal.dmg`, `thadeus_<version>_amd64.deb`) inte beror på `productName` och `name`.
- Ge `.app-brand-text` en kapning (`white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`, som `.lcars-label`) så att ett för långt namn kortas i stället för att flöda ut ur märkesblocket.
- Slå ihop de två debounce-implementationerna i `watcher.js` (från tidigare skanning).
- Ersätt hårdkodade bakgrunder i `.banner-*`, `@keyframes flash` och `::backdrop` med tokens (från tidigare skanning; `::backdrop` använder nu `--backdrop`).

## Interaction Diagrams

Starta appen och återställ sparade projekt:

```mermaid
sequenceDiagram
  participant Main as index.js
  participant Menu as menu.js
  participant IPC as ipc.js
  participant App as App.jsx
  participant Bridge as window.bridge
  participant ST as settings.js
  Main->>Main: app.setPath('userData', appData/aidlc-dash)
  Main->>IPC: registerIpc()
  Main->>Menu: applyMenu(null)
  Menu->>Menu: setAboutPanelOptions({applicationName: APP_NAME, applicationVersion})
  Main->>ST: getSettings()
  Main->>Main: new BrowserWindow(windowOptions(settings)), title
  Main->>Menu: applyMenu(win)
  App->>Bridge: getSettings()
  Bridge->>IPC: settings:get
  IPC->>ST: getSettings() (sanitize)
  ST-->>App: {openProjects, recentProjects, activeProject, animations?, fullscreen?, questionAlerts?, notificationSound?, projectSettings}
  App->>App: data-motion = motionMode(animations)
  loop varje sparat projekt
    App->>Bridge: openProject(dir)
  end
  App->>Bridge: setSettings({openProjects, recentProjects, activeProject})
  App->>Bridge: sendMenuState({hasProject, isAidlc, showFeatures})
```

Text: main låser userData, registrerar IPC, sätter menyn och About-panelen, läser inställningarna och skapar fönstret. App läser de sanerade inställningarna ur samma `aidlc-dash`-mapp, sätter rörelseläget, öppnar de sparade projekten, sparar flikläget och rapporterar menyläget. Ett namnbyte ändrar namnen i det här flödet men inte var inställningarna läses.

Bygga och släppa en version:

```mermaid
sequenceDiagram
  actor Dev as Utvecklare
  participant GH as GitHub Actions (release.yml)
  participant EB as electron-builder
  participant Rel as GitHub Release
  Dev->>GH: push tagg vX.Y.Z
  GH->>GH: verify: tagg == package.json version, vitest
  GH->>EB: build:mac (dmg universal)
  EB-->>GH: dist/<productName>-X.Y.Z-universal.dmg
  GH->>EB: build:linux (deb x64)
  EB-->>GH: dist/<name>_X.Y.Z_amd64.deb
  GH->>GH: upload-artifact mac (dist/*.dmg), linux (dist/*.deb)
  GH->>Rel: gh release create vX.Y.Z artifacts/mac/*.dmg artifacts/linux/*.deb --title "<namn> vX.Y.Z"
```

Text: en tagg kör testerna, bygger `.dmg` och `.deb` vars filnamn kommer från `productName` respektive `name`, laddar upp dem med globbar på filändelsen och skapar releasen med en titel som har namnet i klartext.

Ny audit-händelse i ett öppet projekt:

```mermaid
sequenceDiagram
  participant AIDLC as AI-DLC (skriver audit/*.md)
  participant Watch as watcher.watchIntents
  participant IPC as ipc.js (watchSpace)
  participant Hook as useProject (varje monterat projekt)
  participant App as App.jsx
  participant Svc as projectService
  AIDLC->>Watch: ändrad <intent>/audit/<shard>.md
  Watch->>Watch: debounce 300 ms (max 800 ms)
  Watch->>IPC: onChange {dirNames:[intent], indexChanged, costChanged}
  IPC-->>Hook: project:changed {projectId, space, ...}
  IPC-->>App: questions:changed (alla öppna projekts väntande frågor)
  Hook->>Svc: getIntents(onlyDirs)
  alt intenten är vald
    Hook->>Svc: getIntent(dirName)
    Hook->>Hook: newKeys = nya nycklar (4 s)
  end
```

Text: när AI-DLC skriver i en audit-shard skickar watchern `project:changed`, och main skickar de väntande frågorna till App. Varje projekts hook läser om listan; bara om intenten är vald läses detaljen och nya händelser markeras.

Menykommando till ett projekts terminal:

```mermaid
sequenceDiagram
  actor Person
  participant Menu as menu.js
  participant App as App.jsx
  participant PV as ProjectContent
  participant TC as TerminalContext
  Person->>Menu: Terminal > Claude
  Menu-->>App: menu:command {command:'terminal', action:'claude'}
  App->>App: runTerminal('claude') -> terminalCommand {seq, action, projectId: aktivt}
  App->>PV: prop terminalCommand
  PV->>TC: show('claude') (om projectId matchar)
  TC->>TC: view = {open:true, active:'claude'}, session.focus()
```

Text: menyn skickar ett kommando, App omvandlar det till `terminalCommand` för det aktiva projektet, och det projektets `ProjectContent` öppnar och fokuserar Claude-fliken. "Svara i Claude" går samma väg efter `setActiveId`.

Fortsätt en intent från konsolen:

```mermaid
sequenceDiagram
  actor Person
  participant RB as ResumeButton
  participant TC as TerminalContext
  participant TS as TermSession
  participant Bridge as window.bridge
  participant PTY as pty.js
  Person->>RB: "Fortsätt vid ..."
  RB->>TC: state('claude')
  alt claude arbetar
    RB-->>Person: BUSY_MESSAGE (role=status)
  else ledig
    RB->>TC: sequence([/aidlc intent X + Enter, /aidlc utan Enter])
    TC->>TS: write(text)
    TS->>Bridge: ptyWrite(id, text)
    Bridge->>PTY: pty:write
    PTY-->>TS: pty:data (aktivitet busy, sedan idle)
  end
```

Text: Fortsätt-knappen kontrollerar att claude-fliken inte arbetar, skriver sedan in intentbytet (med Enter) och `/aidlc` (utan Enter) i claude-terminalen via TerminalContext, preload och pty.
