# Integrationstester — EPIC-02

Underlag: `construction/code-generation/code-summary.md`.

Integration testas i riktig Electron med ett tillfälligt skript (sparas inte i repot):
1. Öppna `a reference project`: projektpanelen, kostnad per intent, sortering och fliken Kostnad ska visas utan konsolfel.
2. `getModels` ska ge `source: aidlc-config` (riktigt `aidlc config models`-anrop via inloggningsskalets PATH).
3. Öppna ett projekt utan ledger och skapa sedan `aidlc/.aidlc-sessions/usage-ledger.json`: `costChanged` inom 1 s och kostnaden blir tillgänglig.

Resultat: se `test-results.md`.
