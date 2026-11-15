# Instruktioner för enhetstester — EPIC-03 Audit Timeline

## Ramverk

Testerna körs med Vitest 5.1 och den befintliga `vitest.config.mjs`: Node för `tests/main/**` och jsdom för `tests/renderer/**/*.test.jsx`. Ingen ny konfiguration behövs.

## Körning (bara den här leveransens tester)

```bash
npx vitest run tests/main/parsers.test.js tests/renderer/Timeline.test.jsx
```

Kör sedan hela sviten med `npx vitest run tests/` som regressionskontroll: 61 befintliga och cirka 7 nya tester ska vara gröna.

## Omfång (Minimal)

| Fil | Tester | Krav |
|-----|--------|------|
| `tests/main/parsers.test.js` | +3: nycklar, sortering över tidszoner, händelse utan tidsstämpel | FR2.1, FR3.1, FR3.2 |
| `tests/renderer/Timeline.test.jsx` | 4: inget tak med fönster, exakt markering, räknare, utfällning behålls | FR1.1, FR1.2, FR1.3, FR2.3, FR2.4 |

## Täckning

Det finns inget golv för radtäckning (express och Minimal). Varje ny eller ändrad komponent har minst ett test för det lyckade fallet och tester för kantfall: händelse med äldre tidsstämpel, händelse utan tidsstämpel och blandade tidszoner.

## Mockning och testdata

- **Parsertester:** små Markdown-strängar i testet, utan filer.
- **Tidslinjetester:** syntetiska händelser skapas i en loop, till exempel 3 000 stycken. jsdom saknar layout, så scrollbehållarens mått stubbas (`getBoundingClientRect`, `offsetHeight`, `clientHeight`) eller sätts via virtualiserarens `initialRect`.

## Manuell verifiering (Build and Test)

- **Prestanda (NFR1):** 20 000 syntetiska händelser i riktig Electron. Mät tiden från filterändring till renderad lista (under 200 ms) och kontrollera att scrollningen är jämn.
- **Riktigt projekt:** a reference project's `epic02-finish`, med 1 726 händelser, ska visa alla händelser utan tak.
- **Liveflöde:** lägg till ett block med äldre tidsstämpel i en kopia av en audit-fil. Bara den nya raden ska markeras.
