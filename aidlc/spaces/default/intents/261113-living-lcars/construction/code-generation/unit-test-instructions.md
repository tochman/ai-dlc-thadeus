# Instruktioner för enhetstester — EPIC-04 US-0402 och US-0403

## Ramverk

Testerna körs med Vitest 5.1 och den befintliga `vitest.config.mjs`: Node för `tests/main/**` och jsdom för `tests/renderer/**/*.test.jsx`. Ingen ny konfiguration behövs.

## Körning (bara den här leveransens tester)

```bash
npx vitest run tests/main/theme.test.js tests/main/settings.test.js tests/renderer/AppShell.test.jsx tests/renderer/TerminalPanel.test.jsx
```

Kör sedan hela sviten med `npx vitest run tests/` som regressionskontroll: 81 befintliga och cirka 6 nya tester, alla gröna.

## Omfång (Minimal)

| Fil | Tester | Krav |
|-----|--------|------|
| `tests/main/theme.test.js` | 1: inga färglitteraler utanför `:root` | FR1.2 |
| `tests/main/settings.test.js` | +1: `animations` godtas, ogiltigt värde utelämnas | FR4.2 |
| `tests/renderer/AppShell.test.jsx` | 3: armens navigering och `aria-current`, `data-motion` med standardvärde, Auctum-symbolen i headern | FR2.1, FR2.2, FR4.2, NFR1 |
| `tests/renderer/TerminalPanel.test.jsx` | 1: "Väntar på din Enter" visas och försvinner | FR3.6 |
| alla befintliga | oförändrade förväntningar (regression) | NFR3 |

## Täckning

Det finns inget golv för radtäckning (express och Minimal). Utseendet verifieras visuellt mot mockupen i Build and Test.

## Mockning och testdata

- `window.bridge` och `matchMedia` mockas i renderartesterna.
- `theme.test.js` läser `src/renderer/theme.css` som text.

## Manuell verifiering (Build and Test)

- **Jämförelse med mockupen:** skärmdumpar av projektvyn, konsolen och splashen i riktig Electron jämförs med mockupen, för både aidlc-dash och a reference project.
- **Kontrast:** stickprov på de viktigaste paren.
- **Rörelse:** andning, puls och svep syns med Full. Med Dämpad blir glöden statisk. Med Av finns inga animationer.
- **Bildfrekvens:** cirka 60 fps i projektvyn, mätt med `requestAnimationFrame`.
