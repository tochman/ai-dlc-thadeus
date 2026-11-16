# Test Results: US-1201

Körd 2026-11-16 på `feat/US-1201`, efter att `origin/main` (`077753b`) mergats in enligt projektregeln. Mergen gick utan konflikter.

- **Bygge:** `npx electron-vite build` gav exit 0.
- **Storyns tester:** kommandot i `unit-test-instructions.md` gav 12 filer och 142 tester, alla gröna.
- **Hela sviten:** `npx vitest run tests/ --coverage` gav 129 filer och 1544 tester, alla gröna, med exit 0.
- **Täckning:** 91,63 % av raderna, mot golvet 80 %. Grenar 82,53 % och funktioner 86,59 %. Ingen tröskel bröts.
- **ESLint:** `npx eslint .` gav 0 fel och 25 varningar, alla `react-hooks/exhaustive-deps`.
- **Prettier:** `npx prettier --check . '!.thadeus/tokens/**'` passerar. Undantaget gäller den här datorns ospårade token-filer.
- **Spårbarhet:** `aidlc engine sensor-traceability --stage build-and-test` passerar. AC-1 till AC-6 är täckta.

## Var kontrollerna kördes

- Main-processens kod kördes i Node. Git-testerna mot riktiga repon räknas som integrationstester.
- Vyerna kördes i jsdom, alltså inte i en riktig webbläsarmotor.

Följande är inte kört och prövas för hand i den byggda `.dmg`:en:
- **Plattformarna:** riktiga anrop till GitHub (`gh`), GitLab (`glab`) och Bitbucket.
- **Nyckelringen:** att Bitbucket-uppgifterna sparas i macOS nyckelring.
- **Panelerna:** krockvarningen mot en riktig pull request, underfliken "Datorer" och fliken "Kommentarer".
- **Mergeanteckningen:** att den öppnas i editorn.
- **Linux:** vad `safeStorage` gör där (granskningsfynd R-01).
