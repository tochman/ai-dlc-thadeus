# Technology Stack — aidlc-dash

## Språk och runtime

| Teknik | Version | Belägg |
|---|---|---|
| JavaScript (ESM) + JSX | – | alla filer under `src/` |
| Node.js | 22 | `.nvmrc` |
| Electron | ^45.3.1 | `package.json` devDependencies |
| CSS (egen, ingen ramverk) | – | `src/renderer/theme.css` |

## Ramverk och bibliotek

| Bibliotek | Version | Användning |
|---|---|---|
| React / React DOM | ^19.3.1 | renderar-UI |
| @xterm/xterm | ^6.0.0 | terminalemulering i renderaren |
| @xterm/addon-fit | ^0.11.0 | anpassar terminalstorlek |
| node-pty | ^1.1.0 | pseudoterminaler i huvudprocessen (native) |
| chokidar | ^4.0.3 | filbevakning |
| react-markdown | ^10.1.0 | artefaktrendering |
| remark-gfm | ^4.0.1 | GFM-tabeller m.m. |
| @fontsource/antonio | ^5.3.0 | rubriktypsnitt |

Inget bibliotek för listvirtualisering eller fönstring (t.ex. react-window, @tanstack/react-virtual) används; tidslinjen är ren React. Relevant för EPIC-03 US-0301, vars AC kräver att ett eventuellt nytt beroende motiveras.

## Bygg och paketering

| Verktyg | Version | Roll |
|---|---|---|
| electron-vite | ^6.0.0 | bygger main, preload och renderer till `out/` |
| Vite | ^8.3.8 | bundler |
| @vitejs/plugin-react | ^6.3.0 | JSX |
| electron-builder | ^26.18.0 | macOS universal `.dmg`, Linux x64 `.deb`, osignerat |

## Test

| Verktyg | Version |
|---|---|
| Vitest | ^5.1.0 (projekten `main`/node och `renderer`/jsdom, `vitest.config.mjs`) |
| @testing-library/react | ^16.3.3 |
| jsdom | ^29.1.1 |

jsdom gör ingen layout (alla mått är 0), så tester av en virtualiserad lista måste ge behållarhöjd och radhöjder själva.

## Plattform och CI

- GitHub Actions (`.github/workflows/release.yml`): `ubuntu-latest` (test), `macos-latest` (mac-bygge), `ubuntu-22.04` (linux-bygge för glibc 2.35).
- Mål: macOS (universal) och Ubuntu 22.04+.
- Krav vid körning: `claude` och `aidlc` i användarens inloggningsskal (installeras inte av appen); `git` för EPIC-05.

Versionerna är intervallen i `package.json` från förra skanningen (inte omlästa i denna fokuserade körning); låsta versioner finns i `package-lock.json` (inte läst). Beroenderelationer: [dependencies.md](dependencies.md).
