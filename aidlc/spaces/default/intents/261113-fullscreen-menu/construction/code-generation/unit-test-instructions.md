# Instruktioner för enhetstester — EPIC-04 US-0404

## Ramverk

Testerna körs med Vitest 5.1 och den befintliga `vitest.config.mjs`: Node för `tests/main/**` och jsdom för `tests/renderer/**/*.test.jsx`.

## Körning (bara den här leveransens tester)

```bash
npx vitest run tests/main/menu.test.js tests/main/settings.test.js tests/renderer/AppShell.test.jsx
```

Kör sedan hela sviten med `npx vitest run tests/` som regressionskontroll: 90 befintliga och cirka 7 nya tester, alla gröna.

## Omfång (Minimal)

| Fil | Tester | Krav |
|-----|--------|------|
| `tests/main/menu.test.js` | 4: dev mot paketerat, avstängda poster, Stäng projekt med `CmdOrCtrl+W`, Linux mot macOS | FR2.1, FR2.2, FR2.5, FR2.6 |
| `tests/main/settings.test.js` | +1: `fullscreen` godtas, ogiltigt värde utelämnas | FR1.3 |
| `tests/renderer/AppShell.test.jsx` | +2: helskärmsknappens etikett och `aria-pressed`, menykommandon ger samma resultat som armen | FR1.2, FR2.4, NFR3 |
| alla befintliga | oförändrade förväntningar | NFR2 |

## Mockning

- `buildMenuTemplate` är ren och testas utan Electron. `send` och `actions` är `vi.fn()`.
- `window.bridge` mockas i renderartesterna med `onFullscreen`, `isFullscreen`, `toggleFullscreen`, `onMenuCommand` och `sendMenuState`.

## Manuell verifiering (Build and Test)

Verifieras i riktig Electron:
- menyns innehåll
- helskärm av och på, och att läget finns kvar efter omstart
- `Cmd+W` stänger projektet
- menyposterna är avstängda utan projekt
