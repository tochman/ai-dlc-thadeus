# Kodstruktur: aidlc-dash

## Katalogöversikt

```
src/
  main/          Electron-huvudprocess (Node, ESM)
    parsers/     rena parsers för AI-DLC-filer (används även av renderaren)
  preload/       contextBridge-API (window.bridge)
  renderer/      React-SPA: komponenter (.jsx), hooks, hjälpare, theme.css, index.html
tests/
  main/          Vitest, node-miljö
  renderer/      Vitest + Testing Library, jsdom
  fixtures/      exempelprojekt, audit-shards, ledger, feature-dokument
scripts/         ikongenerering, node-pty-rättigheter, glibc-kontroll
build/           ikonkällor (icon.svg, icon.png, icons/NxN.png)
docs/            FEATURES.md och en fil per epic
.github/workflows/release.yml
```

## Filklassificering

| Kategori | Filer |
|----------|-------|
| Configuration | `package.json`, `electron.vite.config.mjs`, `vitest.config.mjs`, `electron-builder.yml`, `.nvmrc`, `src/renderer/index.html` (CSP) |
| Controller/Handler | `src/main/ipc.js`, `src/preload/index.js` |
| Service/UseCase | `src/main/projectService.js`, `features.js`, `git.js`, `setup.js`, `models.js`, `pty.js`, `watcher.js` |
| Repository/DAO | `src/main/projectAccess.js` (rotbegränsad läsning), `src/main/settings.js` (enda skrivningen) |
| Utility/Helper | `src/main/exec.js`, `src/main/parsers/*.js`, `src/renderer/format.js`, `terminalControl.js`, `featureDocsPrompt.js` |
| UI-komponenter | `src/renderer/*.jsx` (21 filer), hooks `useProject.js`, `useFeatures.js` |
| Static/Asset | `src/renderer/theme.css`, `build/icon.svg`, `build/icon.png`, `build/icons/` |
| Test | `tests/main/*.test.js` (14), `tests/renderer/*.test.jsx` (10), `tests/fixtures/` |

## theme.css i detalj

Filen är 375 rader och importeras en gång i `main.jsx` efter Antonio 400/700 och xterm-css (som importeras i `TerminalPanel.jsx`).

| Rader | Avsnitt | Innehåll |
|-------|---------|----------|
| 1-23 | Tokens | `--bg #0b0b10`, `--panel #15151d`, `--panel-2 #1d1d28`, `--line #2c2c3a`, `--text #ece9f5`, `--muted #aaa6bd`, `--amber #ff9e40`, `--orange #ff7f3f`, `--lavender #c7a8ff`, `--blue #8cb8ff`, `--red #ff7a7a`, `--green #8fdcaa`, `--on-accent #14100a`; `--radius 14px`; `--font-head` (Antonio), `--font-body` (systemfont), `--font-mono`; `color-scheme: dark` |
| 25-48 | Bas | `[hidden] { display: none !important }`, body 14px/1.5, rubriker i Antonio versaler (`h1` amber, `h3`/`.section-title` lavendel, `h4` muted), `:focus-visible` 2px blå outline |
| 50-78 | Kontroller | `.btn` (pillerform, Antonio versaler), `.btn-accent` (amber), `.btn-quiet` (mono, gemener), `.link`, `input[type=search]`, `select`, `.check`, `.field`, `.field-label` |
| 80-85 | Ramar | `.panel` (bakgrund + radie), `.elbow-top` (6px topp + 22px vänster amber, radie 30px uppe till vänster), `.elbow-left` (8px lavendel vänster), `.elbow-bottom` (6px botten + 22px vänster blå, radie 30px nere till vänster), `.muted` |
| 87-131 | App-skal | `.app`, `.app-header` (radie `30px 14px 14px 0`), `.app-title`, `.app-mark`, splash (`.splash`, `.is-leaving`, `.splash-mark`, `.splash-name`, `.splash-bar` + `@keyframes splash-load`), `.project-tabs`, `.project-tab(.is-active)` lavendel, `.app-main`, `.project-body` (grid `340px 1fr`), `.sidebar`, `.content`, `.empty-state` |
| 133-155 | Banners, taggar | `.banner-error`/`-warn` (hårdkodade bakgrunder), `.tag` (kant i `currentColor`), `.tag-active/-live/-warn/-error`, `.live-dot` (grön, `pulse`) |
| 157-194 | Intent-lista och detalj | `.intent-row` (vänsterkant 6px; `status-in-flight` grön, `status-complete` blå, `is-selected` amber), `.facts`, `.request-text`, `.detail-tab(.is-active)` amber |
| 196-247 | Pipeline och kostnad | `.stage-row` (grid med 9 kolumner), `.stage-marker` (10px cirkel; färg per `status-*`), `.is-muted`, `.is-current` (pulse + amber slug), kostnadspanel, `.cost-chart rect` amber, `.cost-table` |
| 249-273 | Tidslinje | `.timeline-scroll`, `.event` (absolut, vänsterkant 4px), `.event-row` (grid 4 kolumner), `.cat-*` (stage blå, subagent lavendel, gate amber, human grön, unit orange, error röd, guard/other muted), `.event.is-new .event-row` (`flash` 4s) |
| 275-303 | DAG och läsare | `.dag-*` SVG-fyllning/kontur, `.dag-node.unit-running` pulse, `.artifact-reader` (grid `280px 1fr`), `.markdown` |
| 305-320 | Terminal | `.terminal-panel` (radie `0 14px 14px 30px`), `.terminal-resize`, `.terminal-bar`, `.term-host`, `.term-state-*` |
| 322-368 | EPIC-05/06 | resume, refresh-panel, setup, features, settings-dialog (`::backdrop rgba(0,0,0,0.6)`) |
| 370-375 | Rörelse | `@keyframes pulse` (opacitet 1 till 0,45), `@keyframes flash` (från `#3a2f12`), `prefers-reduced-motion` stänger av allt |

## Kodmönster

- Funktionskomponenter med hooks; inga klasskomponenter, ingen state-hanterare utöver React.
- Tillståndsklasser som strängar: `is-active`, `is-selected`, `is-current`, `is-muted`, `is-new`, `is-leaving`, `status-<status>`, `cat-<kategori>`, `unit-<status>`, `term-state-<state>`.
- Fel från IPC rensas med en lokal `errorText()` och visas med `role="alert"`; lugna lägen med `role="status"`.
- Alla interaktiva element har `data-testid` i formen `<komponent>-<del>` (se `component-inventory.md`).
- Kommentarer refererar krav-ID:n (FRx.y, NFRx, US-xxxx) och `ponytail:`-förenklingar.
- Renderaren importerar rena moduler från main (`parsers/audit.js`, `ledger.js`, `features.js`).
