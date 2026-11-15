# Integrationstester — EPIC-04 US-0402 och US-0403

Underlag: `construction/code-generation/code-summary.md` och mockupen i `inception/requirements-analysis/mockup/`.

Testerna körs i riktig Electron, med sandlådade inställningar och ett låtsasskal (`tests/.tmp/shots/`, git-ignorerat):

1. **Skärmdumpar:** `shot.cjs` tar skärmdumpar av splashen, huvudvyn, konsolen, kostnaden, tidslinjen, Features, inställningarna, a reference project och ett smalt fönster.
2. **Kontroller i flera storlekar:** `bt.cjs` mäter kontrast från de levande tokens, bildfrekvensen, rörelselägena och pipelinens synlighet vid 1100 × 800, 1440 × 900, 1440 × 980 och 2560 × 1440.
3. **Konsolens storlek:** `resize.cjs` drar i handtaget med musen, ändrar höjden med piltangenterna och provar Dölj.

Jämför skärmdumparna med mockupen. Resultat: se `test-results.md`.
