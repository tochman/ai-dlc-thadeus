# Instruktioner för enhetstester — EPIC-02 Kostnad och modeller

## Ramverk

Testerna körs med Vitest 5.1 och den befintliga `vitest.config.mjs`: Node för `tests/main/**` och jsdom för `tests/renderer/**`. Ingen ny konfiguration behövs.

## Körning (bara den här leveransens tester)

```bash
npx vitest run tests/main/ledger.test.js tests/main/configuredModels.test.js tests/main/watcher.test.js tests/renderer/IntentList.test.jsx tests/renderer/CostPanel.test.jsx
```

Hela sviten körs separat med `npx vitest run tests/` som regressionskontroll. Den ska ge ungefär 38 gröna tester.

## Omfång (Minimal)

| Fil | Tester | Krav |
|-----|--------|------|
| `tests/main/ledger.test.js` | 5: koppling via uuid och saknad post, legacy, pris saknas, scope och tidslinje, modellavvikelse | FR1.1–FR1.4, FR3, FR4.3–FR4.5, FR6.2 |
| `tests/main/configuredModels.test.js` | 2: `aidlc config` lyckas, fallback till agentfiler | FR4.1, FR4.2 |
| `tests/main/watcher.test.js` | +1: ledger-ändring ger `costChanged` | FR5.1 |
| `tests/renderer/IntentList.test.jsx` | +2: sortering på kostnad, "–" utan kostnad | FR1.4, FR1.6 |
| `tests/renderer/CostPanel.test.jsx` | 2: märkningen och "pris saknas", legacy-raden | FR3.4, FR6.1, FR6.2 |

## Täckning

Det finns inget golv för radtäckning (express och Minimal). Varje ny komponent har minst ett test för det lyckade fallet.

## Mockning och testdata

- Testerna läser `tests/fixtures/ledger/usage-ledger.json`. Ledgern är syntetisk med verklig form och innehåller inga riktiga belopp eller sökvägar.
- `getConfiguredModels` tar emot en injicerad `exec`, så att inget riktigt `aidlc`-kommando körs i testerna.
- Watcher-testet använder `tests/.tmp/` (git-ignorerad), som skapas och tas bort av testet.

## Manuell verifiering (Build and Test)

- Kostnader för a reference project visas i appen, och en ny ledger-skrivning syns live.
- `aidlc config models` körs i den paketerade appen och hittar `aidlc` via inloggningsskalets PATH.
