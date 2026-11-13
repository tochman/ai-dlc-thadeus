# Bygginstruktioner — aidlc-dash

## Förutsättningar

- macOS. Bygget är verifierat på x86_64. På Apple Silicon blir arkitekturen den som Node/npm körs med.
- Node 22, med nvm, och npm.
- Minst ca 3 GB ledigt diskutrymme. Electron-binären är ca 260 MB, och paketeringen hämtar en egen kopia och bygger en .dmg på ca 130 MB.
- `claude` och `aidlc` i inloggningsskalets `PATH`. Det behövs bara för terminalflikarna, inte för själva bygget.

## Installation

```bash
npm install
```

- `postinstall` kör `electron-builder install-app-deps`, som bygger om `node-pty` för Electron 45.
- Om Electron-binären blev ofullständig, till exempel för att disken var full, gör du så här:

  ```bash
  rm -rf node_modules/electron/dist
  node node_modules/electron/install.js
  ```

## Miljö

Inga miljövariabler, konfigurationsfiler eller lokala tjänster behövs. Appen sparar sina egna inställningar i `~/Library/Application Support/aidlc-dash/settings.json`.

## Bygg

| Syfte | Kommando | Resultat |
|-------|----------|----------|
| Kompilera main, preload och renderer | `npx electron-vite build` | `out/` |
| Utvecklingsläge med hot reload | `npm run dev` | Startar appen |
| Paketera osignerad macOS-app | `npm run build` | `dist/Auctum AIDLC Control-0.1.0.dmg`, `dist/mac/Auctum AIDLC Control.app` |
| Enhetstester | `npx vitest run tests/` | 20 tester |

## Verifiera bygget

1. Kör `npx electron-vite build`. Det ska sluta med `✓ built`.
2. Kör `./node_modules/.bin/electron .`. Fönstret "BRIDGE CONSOLE" ska öppnas, och konsolen ska inte visa några fel.
3. Kör `npm run build`. Loggen ska innehålla `skipped macOS code signing` och `building target=DMG`, och `dist/` ska innehålla en `.dmg`.
4. Kontrollera att `dist/mac/aidlc-dash.app/Contents/Resources/app.asar.unpacked/node_modules/node-pty/build/Release/pty.node` finns.

## Felsökning

- **`Electron failed to install correctly`:** Binären är ofullständig. Kör kommandona under Installation.
- **`NODE_MODULE_VERSION`-fel för node-pty:** Kör `npx electron-builder install-app-deps`.
- **`[MODULE_TYPELESS_PACKAGE_JSON]`-varning när du kör `src/main` direkt med Node:** Den är ofarlig. Appen körs via electron-vite-bundlen.
- **Gatekeeper blockerar den osignerade appen:** Högerklicka på appen och välj **Öppna** första gången.
