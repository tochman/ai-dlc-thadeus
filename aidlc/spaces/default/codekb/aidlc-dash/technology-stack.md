# Teknikstack: aidlc-dash

Versionerna är intervallen i `package.json`; exakta låsta versioner finns i `package-lock.json` (inte läst).

## Språk och runtime

| Teknik | Version | Anmärkning |
|---|---|---|
| JavaScript (ESM) + JSX | – | ingen TypeScript |
| Node.js | 22 (`.nvmrc`) | utveckling och CI |
| Electron | ^45.3.1 | runtime, devDependency |

## Ramverk och bibliotek (runtime)

| Paket | Version | Syfte |
|---|---|---|
| react, react-dom | ^19.3.1 | UI |
| chokidar | ^4.0.3 | filbevakning |
| node-pty | ^1.1.0 | terminalsessioner (native) |
| @xterm/xterm | ^6.0.0 | terminal i UI |
| @xterm/addon-fit | ^0.11.0 | terminalstorlek |
| react-markdown | ^10.1.0 | markdownvisning |
| remark-gfm | ^4.0.1 | GFM-tabeller m.m. |
| @fontsource/antonio | ^5.3.0 | typsnitt |

## Bygg, paketering och test

| Paket | Version | Syfte |
|---|---|---|
| electron-vite | ^6.0.0 | bygge av main/preload/renderer till `out/` |
| vite | ^8.3.8 | bundler |
| @vitejs/plugin-react | ^6.3.0 | JSX |
| electron-builder | ^26.18.0 | dmg (mac universal) och deb (linux x64) till `dist/` |
| vitest | ^5.1.0 | testkörare |
| @testing-library/react | ^16.3.3 | komponenttester |
| jsdom | ^29.1.1 | DOM i tester |

## Plattform

- macOS (osignerad, ingen notarisering) och Linux (deb). Kräver `claude` och `aidlc` i användarens inloggningsskal.
- CI/CD: GitHub Actions (`actions/checkout@v4`, `setup-node@v4`, `upload/download-artifact@v4`, `gh release`).

Saknas: linter, formatterare, diagrambibliotek, state-bibliotek, router.
