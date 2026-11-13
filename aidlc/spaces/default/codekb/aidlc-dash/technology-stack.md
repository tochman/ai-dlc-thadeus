# Teknikstack: aidlc-dash

## Språk och runtime

| Del | Val | Version |
|-----|-----|---------|
| Språk | JavaScript (ESM), JSX; CommonJS i två skript | – |
| Node | `.nvmrc` | 22 |
| Skrivbordsruntime | Electron | ^45.3.1 |
| Styling | Ren CSS, en global fil (`theme.css`), CSS custom properties | – |

## Ramverk och bibliotek (runtime)

| Bibliotek | Version | Används till |
|-----------|---------|--------------|
| react, react-dom | ^19.3.1 | UI |
| @xterm/xterm | ^6.0.0 | terminal i renderaren (tema i JS) |
| @xterm/addon-fit | ^0.11.0 | terminalstorlek |
| node-pty | ^1.1.0 | pseudoterminaler (native, `asarUnpack`) |
| chokidar | ^4.0.3 | filbevakning |
| react-markdown | ^10.1.0 | artefakter utan rå HTML |
| remark-gfm | ^4.0.1 | tabeller, kryssrutor |
| @tanstack/react-virtual | 3.14.24 (låst) | virtualiserad tidslinje |
| @fontsource/antonio | ^5.3.0 | rubrik- och etikettfont (400, 700), bundlad lokalt |

Inga animations-, ikon- eller komponentbibliotek. All rörelse är CSS-keyframes och transitions.

## Bygg och paketering

| Verktyg | Version | Roll |
|---------|---------|------|
| electron-vite | ^6.0.0 | bygger main, preload, renderer till `out/` |
| vite | ^8.3.8 | bundlare |
| @vitejs/plugin-react | ^6.3.0 | JSX |
| electron-builder | ^26.18.0 | `.dmg` (universal, osignerad) och `.deb` (x64) |

## Test

| Verktyg | Version |
|---------|---------|
| vitest | ^5.1.0 (projekt `main`/node och `renderer`/jsdom) |
| @testing-library/react | ^16.3.3 |
| jsdom | ^29.1.1 |

## Typografi och färg i dag

- Rubriker, etiketter, knappar, taggar: Antonio i versaler (`--font-head`). US-0403 behåller Antonio.
- Brödtext: systemfont (`--font-body`); siffror och kod: `--font-mono`. Ingen `font-variant-numeric: tabular-nums` används ännu (önskas för dataavläsningar i US-0403).
- Palett: amber, orange, lavendel, blå, röd, grön på nästan svart (detaljer i `code-structure.md`).

## Plattformar

macOS (universal) och Ubuntu 22.04 eller nyare. Ingen Windows-målplattform.
