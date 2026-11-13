# Integrationstester — EPIC-03

Underlag: `construction/code-generation/code-summary.md`.

Integrationstesterna körs i riktig Electron med ett tillfälligt skript i `tests/.tmp/` (git-ignorerat):

1. **visinv:** öppna `epic02-finish`, välj fliken Tidslinje och slå på brus. Alla 1 726 händelser ska räknas, och bara ett fönster av rader ska renderas.
2. **Syntetiskt projekt:** ett projekt i `tests/.tmp/` med 20 000 händelser fördelade på två audit-filer. Mät tiden från filterändring till renderad lista, och mät bildrutetiden när listan scrollas.
3. **Liveflöde:** lägg till ett block med äldre tidsstämpel i den ena filen. Ingen synlig rad ska blinka, räknaren "1 ny händelse" ska visas, och ett klick på den ska visa exakt 1 markerad rad.
4. **Tangentbord:** Pil upp och ned samt Home och End ska flytta fokus. `aria-posinset` och `aria-setsize` ska vara satta.

Resultat: se `test-results.md`.
