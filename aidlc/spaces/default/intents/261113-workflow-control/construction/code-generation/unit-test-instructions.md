# Instruktioner för enhetstester — EPIC-05 Workflow Control

## Ramverk

Testerna körs med Vitest 5.1 och den befintliga `vitest.config.mjs`: Node för `tests/main/**` och jsdom för `tests/renderer/**`. Ingen ny konfiguration behövs.

## Körning (bara den här leveransens tester)

```bash
npx vitest run tests/main/git.test.js tests/main/setup.test.js tests/main/watcher.test.js tests/main/configuredModels.test.js tests/renderer/terminalControl.test.jsx tests/renderer/ResumeButton.test.jsx tests/renderer/RefreshPanel.test.jsx tests/renderer/SetupAidlc.test.jsx
```

Kör sedan hela sviten med `npx vitest run tests/` som regressionskontroll. Det ska ge 39 tidigare och ungefär 18 nya tester, alla gröna.

## Omfång (Minimal)

| Fil | Tester | Krav |
|-----|--------|------|
| `tests/main/git.test.js` | 4: status och uppdelning, fallback och ingen fjärr, fjärrändringar och nya intents, avvisade sökvägar och argument | FR3.1, FR3.3–FR3.5, NFR1 |
| `tests/main/setup.test.js` | 3: aidlc saknas, förhandsvisning med konflikter, `buildSetupCommand` | FR4.2–FR4.5, NFR1 |
| `tests/main/watcher.test.js` | +1: `watchForAidlc` | FR4.6 |
| `tests/main/configuredModels.test.js` | oförändrad, regression efter flytten till `exec.js` | FR3.1 |
| `tests/renderer/terminalControl.test.jsx` | 3: idle/busy, `runSequence`, timeout | FR1.2, FR1.3, NFR3 |
| `tests/renderer/ResumeButton.test.jsx` | 3: aktiv intent, annan intent, busy och complete | FR2.1–FR2.4 |
| `tests/renderer/RefreshPanel.test.jsx` | 2: märke och valet Rebase/Merge, avstängd under arbete | FR3.3, FR3.6, FR3.7 |
| `tests/renderer/SetupAidlc.test.jsx` | 2: kommandokedja, avstängd vid konflikter och när aidlc saknas | FR4.2–FR4.5 |

## Täckning

Det finns inget golv för radtäckning (express och Minimal). Varje ny komponent har minst ett test för det lyckade fallet och testas i minst två fel- eller kantfall.

## Mockning och testdata

- Alla git- och aidlc-anrop i `tests/main/**` går genom en injicerad `exec`, som svarar på fasta argumentlistor. Ingen riktig git-fjärr eller `aidlc` körs.
- Renderartesterna mockar `window.bridge` och terminalkontexten. `terminalControl` testas med en fejkad klocka (`vi.useFakeTimers()`).
- Watcher-testet använder `tests/.tmp/` (git-ignorerad), som skapas och tas bort av testet.

## Manuell verifiering (Build and Test)

- **Fortsätt:** prova på en aktiv och en inaktiv in-flight-intent i visinv. Bytet skickas, och `/aidlc` väntar på Enter.
- **Uppdatera:** prova i aidlc-dash mot GitHub. Status och märke ska visas, och valet Rebase/Merge ska skriva rätt kommando i shell-fliken.
- **Initiera AI-DLC:** prova i en tom tillfällig mapp (som inte committas). Förutsättningar, förhandsvisning och kommandokedja ska visas, och vyn ska växla när `aidlc/spaces` dyker upp.
