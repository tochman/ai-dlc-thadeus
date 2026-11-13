# Arkitektur: aidlc-dash

## Architecture Analysis

### System Overview

En Electron-app med tre processdelar som electron-vite bygger till `out/`:

- **Huvudprocessen** (`src/main/`): skapar fönstret, läser AI-DLC-filer inom öppnade projektrötter, bevakar dem med chokidar, kör `git` och `aidlc` med fasta argument, äger pseudoterminalerna (node-pty) och skriver appens `settings.json`. Den sätter i dag ingen egen meny, så Electrons standardmeny visas (US-0404 ska ersätta den).
- **Preload** (`src/preload/index.js`): exponerar ett smalt, namngivet `window.bridge`-API via `contextBridge`. Inget generiskt `invoke` eller `send`.
- **Renderaren** (`src/renderer/`): en React 19-SPA i ett sandboxat fönster (`contextIsolation`, ingen `nodeIntegration`, `sandbox`, CSP i `index.html`). Utseendet styrs av den globala stilmallen `theme.css` med tokens, LCARS-primitiver i `Lcars.jsx` och ett rörelseläge som `App.jsx` sätter som `data-motion` på `<html>`.

### Architectural Style

Monolitisk skrivbordsapp med strikt processgräns: renderaren gör inga fil- eller processanrop själv, allt går via IPC (`ipcMain.handle` / `ipcRenderer.invoke`) och push-händelser (`webContents.send` / `ipcRenderer.on`). Tillstånd hålls i React (App-skalets state per projekt, hooks, en terminal-context per projekt) och i main-processens cacher per projekt. Inga externa tjänster eller nätverks-API:er.

### Component Relationships

App-skalets layout efter designlyftet (verifierad i `App.jsx`; innehållet i `.project-pane` är från tidigare skanning):

```mermaid
flowchart TB
  subgraph Window["BrowserWindow 1440x900 (min 960x600), bakgrund #05060a, standardmeny"]
    Splash["Splash (overlay)"]
    subgraph AppShell[".app"]
      Header["header.app-header: .app-brand (AuctumMark + Auctum / Aidlc control), Bar, Gren, h1.app-title (projekt • vy)"]
      Arm["nav.app-arm: projektblock (+ ⚙ / ×), + Öppna, Intents/Uppsättning, Features, Kostnad, Github, Inställningar, arm-foot"]
      Banner[".banner.banner-error.app-error (valfri)"]
      subgraph Main["main.app-main > .project-pane (en per projekt, dolda med hidden)"]
        PV["ProjectView (vy, paneler, IntentDetail, TerminalPanel, ProjectSettingsDialog)"]
      end
    end
    AppDlg["AppSettingsDialog (modal dialog, Animationer)"]
  end
  Arm -- "setUiOf / togglePanel / setSettingsFor" --> PV
  Arm -- "setAppSettingsOpen" --> AppDlg
```

Text: fönstret har splash-overlayn, app-skalet och en modal app-inställningsdialog. Skalet har ett sidhuvud (märke, dekorstapel, gren, titel med projektnamn och vy), en vänsterarm av LCARS-block och huvudytan med en monterad `ProjectView` per projekt. Armen styr vy och paneler i det aktiva projektet och öppnar inställningarna.

Processer och moduler:

```mermaid
flowchart LR
  subgraph Renderer
    App --> ProjectView
    App --> AppSettingsDialog
    ProjectView --> useProject
    ProjectView --> useFeatures
    ProjectView --> TerminalContext
    TerminalPanel --> TerminalContext
  end
  Preload["preload: window.bridge"]
  subgraph MainProc["Main"]
    Entry["index.js: BrowserWindow"] --> IPC["ipc.js"]
    IPC --> PS["projectService"]
    IPC --> W["watcher"]
    IPC --> PTY["pty"]
    IPC --> G["git"]
    IPC --> S["setup / models"]
    IPC --> F["features"]
    IPC --> ST["settings"]
    PS --> PA["projectAccess"]
    PS --> P["parsers/*"]
  end
  App --> Preload
  useProject --> Preload
  useFeatures --> Preload
  TerminalPanel --> Preload
  Preload --> IPC
  W -- "project:changed" --> Preload
  PTY -- "pty:data / pty:exit" --> Preload
```

Text: App, hooks och terminalpanelen anropar `window.bridge`, som går till `ipc.js`. `index.js` skapar fönstret och registrerar IPC. IPC delegerar till projectService (via projectAccess och parsers), watcher, pty, git, setup/models, features och settings. Watcher och pty skickar händelser tillbaka till renderaren.

### Data Flow

1. Vid start läser App inställningarna (`settings:get`), sätter rörelseläget och öppnar sparade projekt igen (FR1.5). Splash visas tills återställningen är klar.
2. Personen öppnar en mapp (`project:pick`, `project:open`). Main validerar roten (`openRoot`, realpath), detekterar AI-DLC och startar bevakning.
3. `useProject` hämtar intent-lista, vald intents detalj, kostnad och modeller. Detaljen slår ihop `aidlc-state.md` (vinner), `runtime-graph.json`, audit-shards och artefaktfiler.
4. chokidar-ändringar debouncas (300 ms, max 800 ms) och skickas som `project:changed` med vilka intents som ändrats. Renderaren läser bara om dem och markerar nya audit-händelser i 4 s.
5. Terminalens in- och utdata går via `pty:write` och `pty:data`. Aktivitetssignalen (`idle | busy | exited`) räknas i renderaren (`terminalControl.js`).
6. Efter varje flikändring sparar App `openProjects`, `recentProjects` och `activeProject`; valt animationsläge sparas som `animations`. Allt går genom `settings.js` seriella skrivkö och `sanitize()`.

### Key Design Decisions

- **Skrivskyddad mot AI-DLC**; den enda fil appen skriver är `settings.json` i userData (fastlåst till mappen `aidlc-dash`, oberoende av productName).
- **Rotbegränsad filåtkomst** (`resolveInRoot` avvisar absoluta sökvägar, `..` och symlänkar ut ur roten).
- **Smalt preload-API**: varje kanal är en namngiven funktion (`call(channel)` eller `subscribe(channel)`). Alternativ som inte valts: ett generiskt `invoke(channel, ...)`. Följd: varje ny kanal (t.ex. menykommandon eller helskärm i US-0404) kräver en rad i preload och en handler i `ipc.js`, men renderaren kan aldrig nå andra kanaler.
- **App-skalet äger UI-tillståndet per projekt** (`ui[projectId] = {view, cost, github}`) och skickar det som props till `ProjectView`. Följd: menykommandon för vyer och paneler kan landa i App och återanvända samma setters som armen.
- **Allt utseende i en global CSS-fil** med tokens på `:root`, kompletterad av `tokens.js` (läser tokens för t.ex. xterm) och `Lcars.jsx` (`Bar`, `Frame`, `Hairlines`, `Dots`, `Readout`). Alternativ som inte valts: CSS-moduler eller CSS-in-JS.
- **Alla flikar monterade**: dolda projekt och terminaler ligger kvar (`hidden`) så sessioner överlever flikbyten (FR8.4).
- **Rörelse styrs globalt**: `data-motion` (`full | reduced | off`) på `<html>`, satt i `useLayoutEffect` före första målning; utan sparat val blir det `reduced` under `prefers-reduced-motion`.
- **Ingen egen meny och inget helskärmsstöd** (nuläge): `index.js` importerar inte `Menu`, sätter inte `autoHideMenuBar` och lyssnar inte på helskärmshändelser.

Säkerhet: CSP tillåter `style-src 'self' 'unsafe-inline'` och `font-src 'self' data:`, så nya typsnitt måste bundlas lokalt. Fönstret blockerar navigering och nya fönster; `http(s)`-länkar öppnas i OS-webbläsaren. Standardmenyns Reload och DevTools är i dag nåbara i den paketerade appen (risken US-0404 tar bort).

### Improvement Opportunities

- En egen meny (`Menu.setApplicationMenu`) i main, byggd olika för paketerat (`app.isPackaged`) och dev, med en push-kanal (t.ex. `menu:command`) till renderaren enligt det befintliga `subscribe`-mönstret.
- Lyft ut armens inline-åtgärder i `App.jsx` till namngivna funktioner så att menykommandon och knappar delar en kodväg.
- Spara helskärmsläget från main (fönsterhändelser) och läs det före `createWindow()`.
- Ersätt hårdkodade bakgrunder i `.banner-*`, `@keyframes flash` och `::backdrop` med tokens (från tidigare skanning; ej omverifierat efter designlyftet).

## Interaction Diagrams

Starta appen och återställ sparade projekt:

```mermaid
sequenceDiagram
  participant Main as index.js
  participant IPC as ipc.js
  participant App as App.jsx
  participant Bridge as window.bridge
  participant ST as settings.js
  Main->>IPC: registerIpc()
  Main->>Main: createWindow() (BrowserWindow, standardmeny)
  App->>Bridge: getSettings()
  Bridge->>IPC: settings:get
  IPC->>ST: getSettings() (sanitize)
  ST-->>App: {openProjects, recentProjects, activeProject, animations?, projectSettings}
  App->>App: data-motion = motionMode(animations)
  loop varje sparat projekt
    App->>Bridge: openProject(dir)
  end
  App->>Bridge: setSettings({openProjects, recentProjects, activeProject})
```

Text: main registrerar IPC och skapar fönstret. App läser de sanerade inställningarna, sätter rörelseläget, öppnar de sparade projekten och sparar sedan flikläget vid varje ändring.

Öppna projekt och visa liveuppdatering:

```mermaid
sequenceDiagram
  actor Person
  participant App as App.jsx
  participant Hook as useProject
  participant Bridge as window.bridge
  participant IPC as ipc.js
  participant Svc as projectService
  participant Watch as watcher
  Person->>App: "+ Öppna" (addProject)
  App->>Bridge: pickProject(), openProject(dir)
  Bridge->>IPC: project:pick, project:open
  IPC->>Svc: detectProject(root)
  IPC->>Watch: watchIntents(intentsDir, ledger)
  IPC-->>App: {projectId, root, name, detection}
  App->>Hook: ProjectView monteras
  Hook->>Bridge: getIntents, getIntent, getCost, getModels
  Bridge->>IPC: project:intents / intent / cost / models
  IPC->>Svc: loadIntentList, loadIntentDetail, loadCost
  Svc-->>Hook: intents, detail
  Watch-->>Bridge: project:changed {dirNames, indexChanged, costChanged}
  Bridge-->>Hook: onProjectChanged
  Hook->>Bridge: getIntent (live)
```

Text: personen öppnar ett projekt från armen, main detekterar det och startar bevakning, renderaren laddar listan och detaljen. Vid filändringar skickar watchern `project:changed`, och hooken läser om den valda intenten.

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
