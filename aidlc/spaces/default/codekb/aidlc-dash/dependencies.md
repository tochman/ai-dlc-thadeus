# Dependencies — aidlc-dash

Versioner står i [technology-stack.md](technology-stack.md); det interna importschemat i [code-structure.md](code-structure.md) § Beroendeschema.

## Externa beroenden per användare

| Paket | Används av | Not |
|---|---|---|
| electron | `src/main/*`, `src/preload/index.js`, `scripts/make-icon.cjs` | `app`, `BrowserWindow`, `ipcMain`, `dialog`, `shell`, `contextBridge` |
| node-pty | `src/main/pty.js` | dynamisk `import()`; native, packas upp ur asar; `postinstall` bygger om för Electron; CI kontrollerar glibc |
| chokidar | `src/main/watcher.js` | v4 missar filer vars mapp saknas vid start, därför bevakas `aidlc/` för ledgern |
| react, react-dom | alla `src/renderer/*.jsx` | |
| @xterm/xterm, @xterm/addon-fit | `src/renderer/TerminalPanel.jsx` | importerar även xterm.css |
| react-markdown, remark-gfm | `src/renderer/ArtifactReader.jsx` | `skipHtml`, ingen rehype-raw |
| @fontsource/antonio | `src/renderer/main.jsx` | 400 och 700 |

Utvecklingsberoenden (vitest, testing-library, jsdom, electron-vite, vite, plugin-react, electron-builder) används bara i bygge och test.

## Node-stdlib

`node:fs` (promises), `node:path`, `node:crypto` (`randomUUID`), `node:child_process` (`execFile`), `node:url` (skript).

## Externa program vid körning

| Program | Används av | Krav |
|---|---|---|
| användarens `$SHELL` (zsh/bash) | `pty.js`, `models.js` | inloggnings- och interaktivt läge för PATH/nvm |
| `claude` | `pty.js` (claude-fliken) | i inloggningsskalets PATH |
| `aidlc` | `models.js` | valfritt; saknas det används agentfilerna |
| `git` | inget i dag | krävs av EPIC-05 US-0502/US-0503 |

## Interna beroenden mellan lager

- Renderer → Main endast via `window.bridge` (IPC), med två undantag vid bundling: `Timeline.jsx` → `src/main/parsers/audit.js` och `CostTab.jsx` → `src/main/parsers/ledger.js` (rena moduler).
- Tester importerar källmoduler direkt och `scripts/check-glibc.mjs`.

## Risker

- node-pty är den enda native-modulen; plattforms- och glibc-problem hanteras med lazy-laddning och CI-kontroll.
- Inga kända säkerhetsrådgivningar kontrollerades (ingen `npm audit` kördes, enligt skanningsreglerna).
