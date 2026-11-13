# Build and Test — summering

## Byggstatus

- Bygget lyckas. `npx electron-vite build` och `npm run build` returnerar exit 0. Efter Auctum-profileringen heter den osignerade appen `dist/Auctum AIDLC Control-0.1.0.dmg`.
- Auctum-profileringen (steg 13) är verifierad i riktig Electron: startskärm, sidhuvud, fönstertitel och appnamn. Testsviten har nu 20 tester.
- Förutsättningar: se `build-instructions.md`. Diskutrymmet var slut i början av steget, och Electron-binären installerades färdigt när utrymme hade frigjorts.

## Testtyper

| Typ | Genererad | Körd | Var |
|-----|-----------|------|-----|
| Enhetstester (Vitest) | Ja, i Code Generation | Ja, 16/16 | Node och jsdom |
| Integrationskontroll av hela appen | Tillfälligt skript, inte kvar i repot | Ja | Riktig Electron (Chromium-renderare) |
| Prestandamätning (NFR1) | Mätskript i Node | Ja | Node |
| Kontrastberäkning (NFR3) | Beräkning på temafärgerna | Ja | Node |

Minimal-strategin kräver inga extra instruktionsfiler för integration, prestanda eller säkerhet, så inga sådana är skapade.

## Täckningsförväntningar

Express med Minimal-strategi har inget golv för radtäckning. Kravet är ett test per krav på lägsta effektiva nivå och minst ett test för det lyckade fallet per komponent. Det uppfylls av de 16 enhetstesterna och kontrollerna i Electron.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|-----------|--------|----------|--------|----------|--------------|---------|
| TC-strategy | code-generation-plan.md § Testing Contract (`obligations.strategy_volume`) | Ett test per krav, ett test för lyckat fall per komponent, enhetstester som standard | 16 enhetstester över alla logikkomponenter, plus integrationskontroller i Electron | test-results.md § Enhetstester, § Kontroller i riktig Electron | build-and-test | Met |
| TC-scope-floor | code-generation-plan.md § Testing Contract (`obligations.scope_floor`) | Befintlig testsvit grön | 16/16 gröna, exit 0 | test-results.md § Enhetstester | build-and-test | Met |
| TC-ci | org.md § Testing Posture (CI före merge gäller bara mvp, enterprise, feature, infra och classic) | — | — | aidlc-state.md: `ci-pipeline — SKIP` | — | N/A (planen kör ingen CI Pipeline) |
| NFR1 | requirements.md § NFR1 | Intent-listan ≤ 2 s (25 intents, 2 000 händelser), filändring synlig ≤ 1 s | Listan 30 ms (23 intents), största detaljvyn 30 ms (1 726 händelser), filändring till omladdning ≈ 314 ms + 30 ms | test-results.md § NFR-mätningar (Node) | build-and-test | Met |
| NFR2 | requirements.md § NFR2 | En trasig fil påverkar bara sin intent | `readJsonSafe` ger `ok:false` utan undantag, och projectService returnerar senaste giltiga cache per intent | tests/main/projectAccess.test.js, src/main/projectService.js | build-and-test | Met |
| NFR3 | requirements.md § NFR3 | Brödtext ≥ 4,5:1, tangentbordsnåbara kontroller | Lägst 6,61:1 för all text. Alla kontroller är `<button>`, `<input>` eller `<select>` med `:focus-visible`-ram. | test-results.md § NFR-mätningar, src/renderer/theme.css | build-and-test | Met |
| NFR4 | requirements.md § NFR4 | Inga skrivningar till AI-DLC-filer | Inga skrivande fs-anrop i `src/main` utom `settings.js`, som skriver till appens userData. Läsning utanför roten avvisas. | grep i src/main, test-results.md (FR10.2) | build-and-test | Met |
| NFR5 | requirements.md § NFR5 | Fungerar på macOS | Kör i Electron och som paketerad .app på macOS x86_64 | test-results.md § Bygg, § Kontroller | build-and-test | Met |

## Beredskap

- **Byggklar:** ja
- **Testklar:** ja. Alla tester är gröna och alla mål är `Met` eller `N/A`.
- **Driftsättningsklar:** som lokal osignerad app, ja. Signering och notarisering ingår inte i den här omgången (Q4).

## Kända begränsningar och kvarvarande punkter

- **Inte automatiskt verifierat** (kräver en människa vid skärmen):
  - den inbyggda mappväljaren
  - att svara på en riktig gate i claude-fliken
  - att `prefers-reduced-motion` faktiskt fungerar
- **Prestandatesterna (NFR1) kördes i Node.** Hela vägen från fil till pixel i renderaren är inte tidsmätt. Beräknat ligger den under 400 ms.
- **Spårbarheten markerar NFR1 som ej byggd.** I Code Generation markerades NFR1 som `Deferred`, så spårbarhetskontrollen räknar det som en lucka. Här är NFR1 uppmätt och uppfyllt.
- **Avgränsningar från kodgenereringen:**
  - Tidslinjen visar högst 1 500 rader.
  - Markeringen av nya händelser kan träffa fel rad när två maskiners loggar blandas.
  - CSP:n i dev-läge (`npm run dev`) är inte provkörd. Den byggda appen fungerar.
  - `npm audit` visar 6 moderata sårbarheter i dev-beroenden.
- **Bara x86_64 är byggd.** Bygget följer maskinens arkitektur.
