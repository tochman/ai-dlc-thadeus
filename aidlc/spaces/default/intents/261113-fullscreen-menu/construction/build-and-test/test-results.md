# Testresultat — EPIC-04 US-0404 Helskärm och egen appmeny

Underlag: `construction/code-generation/code-generation-plan.md`, `unit-test-instructions.md` och `code-summary.md`.

## Enhetstester och bygge

| Kommando | Exit | Resultat |
|----------|------|----------|
| `npx vitest run tests/` | 0 | 101/101 gröna (efter loop-back 1) |
| `npx electron-vite build` | 0 | Bygget lyckades |

## Kontroll i riktig Electron (macOS)

Skriptet `tests/.tmp/shots/menu.cjs` (git-ignorerat) körde med sandlådade inställningar och ett låtsasskal.

| Kontroll | Resultat |
|----------|----------|
| Menyns innehåll (FR2.1) | Appmenyn, Arkiv, Redigera, Visa, Terminal, Fönster och Hjälp har svenska etiketter och kortkommandon enligt kraven |
| Utvecklingsmenyn (FR2.2) | Ladda om, Tvinga omladdning och Utvecklarverktyg finns bara under "Utveckling" i dev. Inga Electron-länkar. |
| Stäng projekt med `CmdOrCtrl+W` (FR2.6) | Antalet projekt gick från 2 till 1, och fönstret är kvar |
| Helskärmsknappen (FR1.1, FR1.2), efter loop-back 1 | Ett klick ger helskärm. Etiketten blir "Lämna helskärm" med `aria-pressed=true`, och bocken vid "Helskärm" i menyn är ikryssad. Ramarna håller i helskärm, utan horisontell rullning (`menu-fullscreen.png`). |
| Läget finns kvar (FR1.3), efter loop-back 1 | `fullscreen: true` sparas och står kvar när fönstret stängs i helskärm. Nästa start sker i helskärm. Att växla tillbaka sparar `false`. |
| Utan öppet projekt (FR2.5) | Stäng projekt, Projektinställningar…, Kostnad och Claude är avstängda. Helskärm är aktiv. |
| Regression i layouten (designlyftet) | Med aidlc-dash öppet syns pipelinens första rad vid 1100 × 800, 1440 × 900 och 1440 × 980, och hela pipelinen syns vid 2560 × 1440. Ingen horisontell rullning. 60 fps. |
| Konsolfel | 0 |

## Fel

### F-01 (rättad i loop-back 1): Helskärmen går inte att slå på på macOS
- **Repro:** appen startas utan sparat helskärmsläge. Ett klick på "Helskärm", menyvalet eller `Ctrl+Cmd+F` gör ingenting, och samma sak gäller `win.setFullScreen(true)` direkt. `win.isFullScreenable()` är `false`, och inga `enter-full-screen`-händelser kommer.
- **Orsak:** `src/main/index.js` skapar fönstret med `fullscreen: settings.fullscreen === true`. Electron dokumenterar att ett uttryckligt `fullscreen: false` stänger av helskärmsknappen och helskärmsläget på macOS.
- **Ansvarigt steg:** code-generation.
- **Förslag:**
  - skicka `fullscreen: true` bara när läget är sparat och utelämna nyckeln annars, eller sätt `fullscreenable: true`
  - ett enhetstest för fönstrets options, eller en kontroll av hjälpfunktionen som bygger dem
  - kör om `menu.cjs`, inklusive omstart i helskärm (FR1.3)
- **Uppskattad påverkan:** cirka 3 rader och 1 test. Ingen kostnad. Låg risk.

## Loop-Back Log

### Loop-back 1 — 2026-11-13T16:20:16Z
- **Diagnosis:** F-01. Fönstret skapas med ett uttryckligt `fullscreen: false`, och det stänger av helskärm på macOS.
- **Root-cause stage:** code-generation
- **Planned fix:** sätt `fullscreen` bara när läget är sparat, och lägg till `fullscreenable: true`. Lägg till ett test för fönstrets options.
- **Estimated impact:** cirka 3 rader och 1 test. Ingen finansiell kostnad. Låg risk. Användaren valde "Retry with fix".
