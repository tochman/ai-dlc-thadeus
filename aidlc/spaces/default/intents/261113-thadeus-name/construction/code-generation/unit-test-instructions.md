# Instruktioner för enhetstester — EPIC-04 US-0406

## Ramverk

Testerna körs med Vitest 5.1 och den befintliga `vitest.config.mjs`: Node för `tests/main/**` och jsdom för `tests/renderer/**/*.test.jsx`.

## Körning (bara den här leveransens tester)

```bash
npx vitest run tests/main/appName.test.js tests/main/menu.test.js tests/renderer/Splash.test.jsx tests/renderer/AppShell.test.jsx
```

Kör sedan hela sviten med `npx vitest run tests/` som regressionskontroll: 112 befintliga och cirka 2 nya tester, alla gröna.

## Omfång (Minimal)

| Fil | Tester | Krav |
|-----|--------|------|
| `tests/main/appName.test.js` | 2: namnformerna, inga gamla namn i `src/` | FR1.1, FR5.1 |
| `tests/main/menu.test.js` | uppdaterade etiketter | FR2.4 |
| `tests/renderer/Splash.test.jsx` | uppdaterad rubrik, utskrivet namn och tagline | FR2.2 |
| `tests/renderer/AppShell.test.jsx` | uppdaterat märkesblock | FR2.1 |
| alla befintliga | oförändrade i övrigt | NFR2 |

## Manuell verifiering (Build and Test)

- **Skärmdumpar** av sidhuvudet och startskärmen vid 1100 × 800 och 2560 × 1440. Ingen text klipps, och ramarna håller.
- **Paket:** bygg lokalt för Mac (`npm run build`). Kontrollera `THADEUS.app`, `CFBundleIdentifier` `se.auctum.thadeus` och namnet på dmg-filen.
- **deb:** på deb-paketet från CI eller ett lokalt bygge, kontrollera att `dpkg-deb -f` ger `Package: thadeus` och `Replaces/Conflicts: aidlc-dash`.
