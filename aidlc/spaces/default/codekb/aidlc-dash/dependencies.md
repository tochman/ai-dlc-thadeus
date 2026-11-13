# Beroenden: aidlc-dash

## Externa beroenden

Paketlista och versioner finns i `technology-stack.md`. Anmärkningar som påverkar ändringar:

- **node-pty** är native: byggs om för Electron i `postinstall` (`electron-builder install-app-deps`), packas upp ur asar (`asarUnpack`) och dess prebuilds hålls som de är i universal-bygget (`x64ArchFiles`).
- **chokidar** och node-pty externaliseras ur main-bunten (`externalizeDeps: true`).
- **Externa verktyg vid körning**: användarens `$SHELL`, `claude` (startas i terminalfliken). `aidlc` används inte av appens kod i dag.
- **Externa datafiler** (skrivskyddade): se `api-documentation.md`, "Externa datakontrakt".

## Interna beroenden (importgraf)

```
main/index.js        -> main/ipc.js
main/ipc.js          -> projectAccess, projectService, settings, watcher, pty
main/projectService  -> projectAccess, parsers/{intents,state,runtimeGraph,audit,pipeline,units}
main/watcher         -> chokidar
main/pty             -> node-pty
main/settings        -> electron(app), node:fs
main/parsers/*       -> (inga)
preload/index.js     -> electron(contextBridge, ipcRenderer)
renderer/main.jsx    -> App, theme.css, @fontsource/antonio
renderer/App         -> ProjectView, AuctumMark, Splash
renderer/ProjectView -> IntentList, IntentDetail, TerminalPanel, useProject
renderer/IntentDetail-> Pipeline, Timeline, BoltDag, ArtifactReader, format
renderer/Timeline    -> format, main/parsers/audit.js (NOISY_EVENTS)
renderer/Pipeline, BoltDag, IntentList -> format
renderer/ArtifactReader -> react-markdown, remark-gfm
renderer/TerminalPanel  -> @xterm/xterm, @xterm/addon-fit
renderer/Splash      -> AuctumMark
```

Renderer-komponenter som pratar med main gör det bara via den globala `window.bridge` (App, useProject, ArtifactReader, TerminalPanel), aldrig via import.

Inga cirkulära beroenden.
