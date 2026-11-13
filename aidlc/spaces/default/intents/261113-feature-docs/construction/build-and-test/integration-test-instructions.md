# Integrationstester — EPIC-06

Underlag: `construction/code-generation/code-summary.md`.

Integrationstesterna körs i riktig Electron med ett tillfälligt skript i `tests/.tmp/`, mot en kopia av repots `docs/` och `aidlc/`.

1. **Features-vyn:** öppna Features och kontrollera att alla epics och storys visas, att filtret fungerar och att story-länkar går till intents.
2. **Liveuppdatering:** ändra en epic-fil i kopian. Ändringen ska synas i vyn.
3. **Projektinställningar:** välj Dölj och kontrollera att växeln försvinner. Ange sedan en ogiltig sökväg och kontrollera att Spara är avstängd. Återställ till Automatiskt.

Resultat: se `test-results.md`.
