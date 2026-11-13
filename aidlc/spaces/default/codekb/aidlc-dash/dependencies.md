# Dependencies — aidlc-dash

Versioner står i [technology-stack.md](technology-stack.md); det interna importschemat i [code-structure.md](code-structure.md) § Beroendeschema.

## Externa beroenden per användare

| Paket | Används av | Not |
|---|---|---|
| electron | `src/main/*`, `src/preload/index.js`, `scripts/make-icon.cjs` | `app`, `BrowserWindow`, `ipcMain`, `dialog`, `shell`, `contextBridge` |
| node-pty | `src/main/pty.js` | dynamisk `import()`; native, packas upp ur asar; `postinstall` bygger om för Electron; CI kontrollerar glibc |
| chokidar | `src/main/watcher.js` | v4 missar filer vars mapp saknas vid start, därför bevakas `aidlc/` för ledgern; används även av `watchForAidlc` |
| react, react-dom | alla `src/renderer/*.jsx`, `useProject.js` | `Timeline.jsx` använder bara `useMemo`/`useState` |
| @xterm/xterm, @xterm/addon-fit | `src/renderer/TerminalPanel.jsx` | importerar även xterm.css |
| react-markdown, remark-gfm | `src/renderer/ArtifactReader.jsx` | `skipHtml`, ingen rehype-raw |
| @fontsource/antonio | `src/renderer/main.jsx` | 400 och 700 |

Utvecklingsberoenden (vitest, testing-library, jsdom, electron-vite, vite, plugin-react, electron-builder) används bara i bygge och test.

## Node-stdlib

`node:fs` (promises), `node:path`, `node:crypto` (`randomUUID`), `node:child_process` (`execFile`), `node:url` (skript).

## Externa program vid körning

| Program | Används av | Krav |
|---|---|---|
| användarens `$SHELL` (zsh/bash) | `pty.js`, `models.js`, `exec.js` | inloggnings- och interaktivt läge för PATH/nvm |
| `claude` | `pty.js` (claude-fliken) | i inloggningsskalets PATH |
| `aidlc` | `models.js`, `setup.js` | valfritt; saknas det används agentfilerna |
| `git` | `git.js`, `setup.js` via `exec.js` (EPIC-05, ytligt) | krävs för Uppdatera från GitHub och Initiera AI-DLC |

## Interna beroenden mellan lager

- Renderer → Main endast via `window.bridge` (IPC), med två undantag vid bundling: `Timeline.jsx` → `src/main/parsers/audit.js` (`NOISY_EVENTS`) och `CostTab.jsx` → `src/main/parsers/ledger.js` (rena moduler).
- Audit-händelser flödar `parsers/audit.js` → `projectService.loadAuditEvents` → IPC `project:intent` → `useProject` → `IntentDetail` → `Timeline`; samma lista används av `parsers/units.js`.
- Tester importerar källmoduler direkt och `scripts/check-glibc.mjs`.

## Risker

- node-pty är den enda native-modulen; plattforms- och glibc-problem hanteras med lazy-laddning och CI-kontroll.
- Ett virtualiseringsbibliotek för EPIC-03 vore ett nytt renderar-beroende; AC kräver att valet motiveras mot egen fönstring.
- Inga kända säkerhetsrådgivningar kontrollerades (ingen `npm audit` kördes, enligt skanningsreglerna).
