# Integrationstester — EPIC-05 US-0505

Underlag: `requirements.md` och `construction/code-generation/code-summary.md`.

1. Kör `./node_modules/.bin/electron tests/.tmp/shots/qpop.cjs` i bakgrunden. Skriptet öppnar visinv (aktivt) och aidlc-dash.
2. Låt AI-DLC registrera en riktig väntande fråga i aidlc-dash, till exempel när en stage läggs fram för godkännande.
3. Kontrollera följande:
   - popupen visas och notisen skapas, eftersom ett annat projekt är aktivt
   - efter 21 s finns `is-overdue` och rubriken "Väntar fortfarande på ditt svar"
   - "Svara i Claude" byter till aidlc-dash och sätter fokus i terminalen
