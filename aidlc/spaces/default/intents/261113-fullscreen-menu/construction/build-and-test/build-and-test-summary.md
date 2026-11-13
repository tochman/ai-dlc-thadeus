# Build and Test — sammanfattning EPIC-04 US-0404

Underlag: `test-results.md` och `construction/code-generation/code-summary.md`.

- **Tester och bygge:** 101/101 gröna, och bygget lyckas.
- **Menyn:** egen svensk meny enligt FR2.1. Reload, DevTools och Electron-länkar finns bara under "Utveckling" i dev.
- **Stäng projekt:** `Cmd/Ctrl+W` stänger projektet och inte fönstret.
- **Avstängda poster:** utan projekt är projektposterna avstängda.
- **F-01 rättad i loop-back 1:**
  - helskärm fungerar via knappen, menyn och kortkommandot
  - etiketten växlar mellan "Helskärm" och "Lämna helskärm"
  - läget finns kvar efter omstart
- **Ingen regression** i layouten från designlyftet.
- **Kvar, inte blockerande:** Linux kontrolleras manuellt vid röktestet av v0.2.0 (dold menyrad med `Alt`, `F11`).
