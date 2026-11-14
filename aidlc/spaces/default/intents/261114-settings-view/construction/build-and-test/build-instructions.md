# Build Instructions — US-0405 Inställningar som vy

## Förutsättningar

| Krav | Värde |
|------|-------|
| Node | samma som utvecklingsmiljön (npm-beroenden installerade) |
| Katalog | repo-roten |
| Beroenden | redan installerade; storyn lägger inga nya (C5) |

## Steg

1. **Beroenden** (bara om `node_modules` saknas):

   ```bash
   npm install
   ```

   `postinstall` kör `electron-builder install-app-deps` och `scripts/fix-pty-perms.cjs`, som behövs för `node-pty`.

2. **Bygg** (main, preload och renderer till `out/`):

   ```bash
   npx electron-vite build
   ```

   `npm run build` gör samma sak men lägger dessutom ett macOS-paket via `electron-builder --mac`; det behövs inte för att verifiera den här storyn.

3. **Verifiera bygget** — kommandot ska avsluta med exitkod 0 och skriva tre block:

   | Mål | Förväntat |
   |-----|-----------|
   | `out/main/index.js` | `building ssr environment for production` → `✓ built` |
   | `out/preload/index.js` | `building ssr environment for production` → `✓ built` |
   | `out/renderer/index.html` + `assets/index-*.js` | `building client environment for production` → `✓ built` |

4. **Tester:**

   ```bash
   npx vitest run tests/main/tools.test.js tests/main/settings.test.js tests/main/pty.test.js tests/main/i18nKeys.test.js tests/renderer/SettingsView.test.jsx tests/renderer/AppShell.test.jsx
   ```

   och hela sviten en gång:

   ```bash
   npm test
   ```

## Felsökning

| Symptom | Orsak | Åtgärd |
|---------|-------|--------|
| `Cannot find module 'node-pty'` | `postinstall` har inte körts | `npm install` igen |
| Renderer-bygget klagar på en okänd import i `SettingsView.jsx` | fel sökväg till `Lcars.jsx`/`shared/harnesses.js` | kontrollera relativa sökvägar; `src/renderer/` → `../shared/` |
| `i18nKeys.test.js` fallerar på `settings.*` / `errors.tool*` | nycklar saknas i `en.json` eller `sv.json` | lägg samma nyckel i båda filerna |
| `tools.test.js` fallerar på `chmod` | filsystemet tillåter inte execute-bit | testet kräver ett vanligt lokalt filsystem (APFS/ext4) |
