# Arkitektur: aidlc-dash

## Architecture Analysis

### System Overview

En Electron-app i tre lager: huvudprocessen (Node) läser och tolkar AI-DLC-filer och kör terminaler, preload exponerar ett smalt namngivet API, och en sandboxad React-renderer visar data. Ingen server, inget nätverk, ingen databas. Komponenterna listas i `component-inventory.md`.

### Architectural Style

Monolitisk skrivbordsapp med Electrons process-isolering (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `src/main/index.js:16-21`). Main-sidan är lagerindelad: IPC-yta → tjänst → rena parsers → root-begränsad filåtkomst.

### Component Relationships

```mermaid
flowchart LR
  subgraph Renderer["Renderer (React, sandbox)"]
    App --> ProjectView
    ProjectView --> useProject
    ProjectView --> TerminalPanel
    ProjectView --> IntentList
    ProjectView --> IntentDetail
    IntentDetail --> Pipeline
    IntentDetail --> Timeline
    IntentDetail --> BoltDag
    IntentDetail --> ArtifactReader
  end
  subgraph Preload
    bridge["window.bridge"]
  end
  subgraph Main["Main (Node)"]
    ipc --> projectService
    ipc --> watcher
    ipc --> pty
    ipc --> settings
    ipc --> projectAccess
    projectService --> parsers
    projectService --> projectAccess
  end
  useProject --> bridge
  TerminalPanel --> bridge
  ArtifactReader --> bridge
  App --> bridge
  bridge -->|invoke| ipc
  ipc -->|project:changed| bridge
  pty -->|pty:data / pty:exit| bridge
  watcher -.->|chokidar| FS[("aidlc/spaces/space/intents/")]
  projectAccess -.->|fs read| FS
```

Textalternativ: Renderern (App, ProjectView, useProject, IntentList, IntentDetail med Pipeline/Timeline/BoltDag/ArtifactReader, TerminalPanel) anropar bara `window.bridge`. Preload översätter till `ipcRenderer.invoke` mot `ipc` i main. `ipc` delegerar till `projectService` (som använder `parsers` och `projectAccess`), `watcher`, `pty` och `settings`. Händelser går tillbaka som `project:changed`, `project:watchError`, `pty:data` och `pty:exit`. Endast `watcher` och `projectAccess` rör projektets filer.

### Data Flow

1. Användaren väljer mapp (`project:pick`) → `project:open` realpath-validerar roten, kör `detectProject` och startar bevakning av aktiv space.
2. `useProject` hämtar `project:intents` (lista) och `project:intent` (detalj). `projectService` läser filer via `projectAccess`, tolkar dem med `parsers` och cachar resultatet per root/space/intent.
3. Vid filändring skickar `watcher` (debounce 300 ms, max 800 ms) `{dirNames, indexChanged}`; `useProject` laddar om bara de namngivna intenterna och detaljen om den berörs.
4. Trasig eller halvskriven JSON ger `{ok:false}` från `readJsonSafe`; tjänsten returnerar då senaste giltiga värde.

### Key Design Decisions

- **Skrivskydd och rotbegränsning**: `projectAccess.js` innehåller inga skrivanrop; `resolveInRoot` avvisar absoluta sökvägar, `..` och symlänkar ut ur roten. Alternativet att låta renderern läsa filer direkt valdes bort av säkerhetsskäl.
- **state-filen vinner över runtime-graph** (`parsers/pipeline.js`): `runtime-graph.json` är git-ignorerad och kan saknas; avvikelser flaggas i stället för att döljas.
- **Inkrementell omladdning**: watcher rapporterar intent-mappar, så bara dessa läses om (FR7.2).
- **Delade rena moduler**: renderern importerar `NOISY_EVENTS` direkt från `main/parsers/audit.js` (ren modul, säker att bunta).
- **Inget diagrambibliotek**: `BoltDag` ritar SVG för hand.

### Improvement Opportunities

- **EPIC-02-anslutning**: `usage-ledger.json` ligger i `aidlc/.aidlc-sessions/`, utanför bevakad mapp (`ipc.js:33-34`). Behöver en andra bevakning (eller en bredare med filter), en ledger-parser bredvid övriga parsers, en ny `project:*`-kanal och en ny flagga i `project:changed`. Detaljer i `code-quality-assessment.md`.
- Ingen kapabilitet för att köra icke-interaktiva kommandon (`aidlc config models`) finns; bara node-pty.
- CSV-export bryter löftet om en enda skrivning; kräver ett medvetet beslut och en dialog (`dialog.showSaveDialog`).

## Interaction Diagrams

### Öppna projekt och visa intent

```mermaid
sequenceDiagram
  participant R as Renderer (App/useProject)
  participant B as window.bridge
  participant I as ipc.js
  participant S as projectService
  participant A as projectAccess
  participant W as watcher
  R->>B: openProject(dir)
  B->>I: project:open
  I->>A: openRoot(dir)
  I->>S: detectProject(root)
  I->>W: watchIntents(intentsDir)
  I-->>R: {projectId, root, detection}
  R->>B: getIntents(projectId, space)
  B->>I: project:intents
  I->>S: loadIntentList
  S->>A: readJsonSafe / listDir / readText
  S-->>R: {intents, warning}
  R->>B: getIntent(projectId, space, dirName)
  B->>I: project:intent
  I->>S: loadIntentDetail
  S-->>R: {state, graph, pipeline, events, units, files, warnings}
```

Textalternativ: Renderern öppnar ett projekt via `project:open`, som validerar roten, identifierar projektet och startar bevakning. Därefter hämtas listan (`project:intents`) och vald intents detalj (`project:intent`); båda läses via `projectAccess` och tolkas av parsers.

### Liveuppdatering

```mermaid
sequenceDiagram
  participant FS as Filsystem
  participant W as watcher
  participant I as ipc.js
  participant U as useProject
  FS->>W: ändring i intents/<dir>/...
  W->>W: debounce 300 ms (max 800 ms)
  W->>I: onChange({dirNames, indexChanged})
  I->>U: project:changed {projectId, space, dirNames, indexChanged}
  U->>I: project:intents (onlyDirs = dirNames)
  U->>I: project:intent (om vald intent berörs)
  U->>U: markera nya audit-händelser 4 s
```

Textalternativ: En filändring under `intents/` samlas av watcher, skickas som `project:changed`, och `useProject` laddar om bara de berörda intenterna samt detaljen om den vald intent ändrats. Nya audit-händelser markeras i fyra sekunder.

### Terminalsession

```mermaid
sequenceDiagram
  participant T as TerminalPanel
  participant I as ipc.js
  participant P as pty.js
  T->>I: pty:spawn {projectId, kind, cols, rows}
  I->>P: spawnSession (cwd = projektrot)
  P-->>T: id
  T->>I: pty:write / pty:resize
  P-->>T: pty:data {id, data}
  P-->>T: pty:exit {id, exitCode}
```

Textalternativ: TerminalPanel startar en `claude`- eller `shell`-session via `pty:spawn`, skriver och ändrar storlek via `pty:write`/`pty:resize`, och tar emot utdata och avslut som `pty:data`/`pty:exit`.
