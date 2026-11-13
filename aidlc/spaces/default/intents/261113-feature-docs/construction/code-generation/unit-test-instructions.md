# Instruktioner för enhetstester — EPIC-06 Feature Docs

## Ramverk

Testerna körs med Vitest 5.1 och den befintliga `vitest.config.mjs`: Node för `tests/main/**` och jsdom för `tests/renderer/**/*.test.jsx`. Ingen ny konfiguration behövs.

## Körning (bara den här leveransens tester)

```bash
npx vitest run tests/main/features.test.js tests/main/settings.test.js tests/renderer/FeaturesView.test.jsx tests/renderer/ProjectSettingsDialog.test.jsx tests/renderer/SetupAidlc.test.jsx
```

Kör sedan hela sviten med `npx vitest run tests/` som regressionskontroll. Det ska bli 68 befintliga och cirka 12 nya tester, alla gröna.

## Omfång (Minimal)

| Fil | Tester | Krav |
|-----|--------|------|
| `tests/main/features.test.js` | 4: tolkning, avvikande fil, saknad översikt och länk utanför roten, story-id och länkar | FR1.1–FR1.4, FR2.6, NFR2 |
| `tests/main/settings.test.js` | 2: validering av projektinställningar, samtidiga skrivningar | FR3.4, FR3.5 |
| `tests/renderer/FeaturesView.test.jsx` | 3: visning med kriterieantal, statusfilter, reservvisning | FR2.1–FR2.5, FR1.4 |
| `tests/renderer/ProjectSettingsDialog.test.jsx` | 2: spara, ogiltig sökväg | FR3.1–FR3.3 |
| `tests/renderer/SetupAidlc.test.jsx` | +1: valet för feature-dokument och förfrågan | FR4.1–FR4.4 |

## Täckning

Det finns inget golv för radtäckning (express och Minimal). Varje ny komponent har minst ett test för det lyckade fallet och prövas i kantfallen saknad översikt, avvikande fil och ogiltig sökväg.

## Mockning och testdata

- Testdata ligger i `tests/fixtures/features/`. Det är syntetiska dokument i formatet, varav ett avsiktligt avvikande.
- `settings.test.js` använder en tillfällig `userData`-mapp under `tests/.tmp/` (git-ignorerad), eller en injicerad sökväg om modulen stöder det.
- Renderartesterna mockar `window.bridge` och terminalkontexten.

## Manuell verifiering (Build and Test)

- **aidlc-dash:** Features-vyn ska visa EPIC-01 till EPIC-06 med storys och kriterieantal. Story-id:n ska länka till intents, till exempel US-0501 till `261113-workflow-control`.
- **Liveuppdatering:** en ändring i en epic-fil ska synas inom cirka 1 s.
- **Projektinställningar:** Dölj ska ta bort växeln, och en annan sökväg ska fungera.
- **Uppsättning:** i en tom mapp ska valet och knappen "Skapa feature-beskrivningar" visas efter uppsättningen, och förfrågan ska skrivas utan Enter.
- **Prestanda (NFR1):** tolkning och visning ska ta under 300 ms.
