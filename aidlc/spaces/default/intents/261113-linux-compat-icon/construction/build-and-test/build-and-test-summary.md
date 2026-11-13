# Build and Test — summering (v0.1.1)

Underlag: `construction/code-generation/code-generation-plan.md`, `unit-test-instructions.md` och `code-summary.md`.

## Byggstatus

- **Bygget lyckas:**
  - lokalt med `npm run build:mac` (universal `.dmg`)
  - i CI med `build-linux` på `ubuntu-22.04`, inklusive glibc-kontrollen, och `build-mac`, båda gröna
- **Ett fel rättades inom steget:** Linux-ikonerna fanns bara i 1024 px. De finns nu i 16–512 px.

## Testtyper

| Typ | Körd | Var |
|-----|------|-----|
| Enhetstester (26, varav 6 nya) | Ja, 26/26 | Node och jsdom |
| Riktat regressionstest: appen startar utan node-pty | Ja | Node (mock av node-pty) |
| Kontroll av byggresultatet (glibc, prebuilds, ikoner) | Ja | GitHub Actions, ubuntu-22.04 och den nedladdade `.deb` |
| Kontroll av macOS-paketet (icns och start) | Ja | Lokalt, macOS |

Minimal-strategin kräver inga extra instruktionsfiler för integration, prestanda eller säkerhet.

## Täckning

Det finns inget golv för radtäckning (bugfix och Minimal). Varje ny komponent har tester, och det finns ett riktat regressionstest.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|-----------|--------|----------|--------|----------|--------------|---------|
| TC-regression | code-generation-plan.md § Testing Contract (`scope_floor`) | Riktat regressionstest för buggen | `tests/main/pty.test.js`: import av `pty.js` laddar inte node-pty, och ett laddningsfel ger ett svenskt felmeddelande | test-results.md § Enhetstester | build-and-test | Met |
| TC-suite | code-generation-plan.md § Testing Contract (`scope_floor`) | Befintlig svit grön | 26/26, exit 0 | test-results.md | build-and-test | Met |
| TC-strategy | code-generation-plan.md § Testing Contract (`strategy_volume`) | Ett test per krav och ett test för lyckat fall per komponent | pty, check-glibc och ikon har var sitt test, plus kontroll av byggresultatet för FR1 och FR3 | test-results.md | build-and-test | Met |
| TC-ci | org.md § Testing Posture | — | — | aidlc-state.md: `ci-pipeline` ingår inte i bugfix-scope | — | N/A (planen kör ingen CI Pipeline) |
| NFR1 | requirements.md § NFR1 | Paketet kör på Ubuntu 22.04 (glibc 2.35) och nyare | Alla ELF-binärer i paketet kräver högst glibc 2.35 och `GLIBCXX_3.4.30`. `pty.node` kräver högst `GLIBC_2.34`. Bygget sker på `ubuntu-22.04`. | CI-körning 43394678127, glibc-kontrollen och analysen av den nedladdade `.deb` | build-and-test | Met |
| NFR2 | requirements.md § NFR2 | Inga regressioner, macOS universal fungerar | 26/26 gröna, macOS universal byggd och startad | test-results.md | build-and-test | Met |

## Beredskap

- **Byggklar:** ja
- **Testklar:** ja. Alla mål är `Met` eller `N/A`.
- **Driftsättningsklar:** ja, för release v0.1.1 när PR #4 (och gärna PR #3 först) är mergad till `main`.

## Kvarvarande punkter

- **Ingen riktig installation på Linux:** `.deb` har inte installerats och startats på Ubuntu 22.04. Det görs på användarens maskin efter releasen, som slutkontroll av NFR1. CI-bygget och glibc-analysen är det maskinella beviset.
- **Ikonen på installerad release:** Den ska verifieras visuellt i Dock och startmeny (US-0401), och användaren ska godkänna designen.
- **R-01 från kodgranskningen:** Att ett misslyckat laddningsförsök görs om är bara bevisat med mock. Risken är accepterad.
