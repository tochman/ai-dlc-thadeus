# Dependencies — aidlc-dash

Versioner står i [technology-stack.md](technology-stack.md); det interna importschemat i [code-structure.md](code-structure.md) § Beroendeschema.

## Externa beroenden per användare

| Paket | Används av | Not |
|---|---|---|
| electron | `src/main/*`, `src/preload/index.js`, `scripts/make-icon.cjs` | `app` (userData för `settings.json`), `BrowserWindow`, `ipcMain`, `dialog`, `shell` (`showItemInFolder`, `openPath`), `contextBridge`, `ipcRenderer` |
| node-pty | `src/main/pty.js` | dynamisk `import()`; native, packas upp ur asar; `postinstall` bygger om för Electron och kör `fix-pty-perms.cjs`; CI kontrollerar glibc |
| chokidar | `src/main/watcher.js` | v4 missar filer vars mapp saknas vid start, därför bevakas `aidlc/` för ledgern; används även av `watchForAidlc` |
| react, react-dom | alla `src/renderer/*.jsx`, `useProject.js` | hooks; ingen router, inget tillståndsbibliotek |
| @tanstack/react-virtual | `src/renderer/Timeline.jsx` | `useVirtualizer` (EPIC-03, ytligt); exakt version, inget intervall |
| @xterm/xterm, @xterm/addon-fit | `src/renderer/TerminalPanel.jsx` | importerar även xterm.css |
| react-markdown, remark-gfm | `src/renderer/ArtifactReader.jsx` (`FileContent`, även via RefreshPanel) | `skipHtml`, ingen rehype-raw; egna komponenter för `a` och `img` |
| @fontsource/antonio | `src/renderer/main.jsx` | 400 och 700 |

Utvecklingsberoenden (vitest, testing-library, jsdom, electron-vite, vite, plugin-react, electron-builder) används bara i bygge och test.

## Node-stdlib

`node:fs` (promises), `node:path`, `node:crypto` (`randomUUID` i `ipc.js` och `pty.js`), `node:child_process` (`execFile`), `node:url` (skript).

## Externa program vid körning

| Program | Används av | Krav |
|---|---|---|
| användarens `$SHELL` (zsh/bash) | `pty.js`, `models.js`, `exec.js` | inloggnings- och interaktivt läge för PATH/nvm |
| `claude` | `pty.js` (claude-fliken) | i inloggningsskalets PATH |
| `aidlc` | `models.js`, `setup.js` (`--version`, `config --dry-run`, `config project --show --json`) | valfritt för vyerna; krävs för Initiera AI-DLC |
| `git` | `git.js`, `setup.js` (`isGitRepo`) via `exec.js` | krävs för Uppdatera från GitHub; saknat repo ger `git init -b main` i kommandokedjan |

## Interna beroenden mellan lager

- Renderer → Main endast via `window.bridge` (IPC), med två undantag vid bundling: `Timeline.jsx` → `src/main/parsers/audit.js` (`NOISY_EVENTS`) och `CostTab.jsx` → `src/main/parsers/ledger.js` (rena moduler). En ny feature-parser kan följa samma mönster om renderaren behöver den.
- Audit-händelser flödar `parsers/audit.js` → `projectService.loadAuditEvents` → IPC `project:intent` → `useProject` → `IntentDetail` → `Timeline`; samma lista används av `parsers/units.js`.
- Uppsättning flödar `SetupAidlc` → `setup:info`/`setup:command` → `setup.js` → `exec.js`/`git.js`/`projectAccess.js`; kommandot går tillbaka till renderaren och skrivs i terminalen via `TerminalContext`.
- Tester importerar källmoduler direkt och `scripts/check-glibc.mjs`.

## Risker

- node-pty är den enda native-modulen; plattforms- och glibc-problem hanteras med lazy-laddning och CI-kontroll.
- EPIC-06 behöver inget nytt beroende för Markdown (react-markdown + remark-gfm finns) eller bevakning (chokidar finns).
- Inga kända säkerhetsrådgivningar kontrollerades (ingen `npm audit` kördes, enligt skanningsreglerna).
