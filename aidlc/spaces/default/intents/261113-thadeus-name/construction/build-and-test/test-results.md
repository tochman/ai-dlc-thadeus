# Testresultat — EPIC-04 US-0406 Namnet T.H.A.D.E.U.S.

Underlag: `construction/code-generation/code-generation-plan.md`, `unit-test-instructions.md` och `code-summary.md`.

## Enhetstester och bygge

| Kommando | Exit | Resultat |
|----------|------|----------|
| `npx vitest run tests/` | 0 | 116/116 gröna, varav 4 nya |
| `npx electron-vite build` | 0 | Bygget lyckades |
| `npm run build` (macOS) | 0 | `dist/THADEUS-0.2.0-universal.dmg`. I `THADEUS.app` är `CFBundleIdentifier` `se.auctum.thadeus` och `CFBundleName` `THADEUS`. |

## Kontroll i riktig Electron

Kontrollen gjordes med `tests/.tmp/shots/name.cjs` (git-ignorerad), med sandlådade inställningar.

| Kontroll | Resultat |
|----------|----------|
| Fönstertitel och `<title>` (FR2.3) | "T.H.A.D.E.U.S." |
| Menyn (FR2.4) | Toppmenyn heter "T.H.A.D.E.U.S." och första posten "Om T.H.A.D.E.U.S." |
| Sidhuvudet (FR2.1, NFR1) | Bara "T.H.A.D.E.U.S." på en rad. Texten är 72 px bred och ryms helt, med 12 px marginal till armbågens kant. Samma vid 1100 × 800 och 2560 × 1440 (`name-main-1100.png`, `name-main-2560.png`). |
| Startskärmen (FR2.2, NFR1) | Symbolen, "T.H.A.D.E.U.S.", det utskrivna namnet på två balanserade rader och taglinen. Inget flödar över vid 1100 × 800 (`name-splash-1100.png`). |
| Inställningar (FR4.1) | Sandlådans inställningar och öppna projekt laddades som förut, eftersom userData fortfarande är `aidlc-dash` |
| Konsolfel | 0 |

## Kvar till CI

- **deb-paketet** kan inte byggas lokalt på macOS. CI-körningen på PR:en bygger det. Paketet kontrolleras då ur artefakten: `Package: thadeus`, `Replaces/Conflicts: aidlc-dash` och `Name=T.H.A.D.E.U.S.` i `.desktop`. Konfigurationen är redan validerad av electron-builders egen `validateConfiguration`, enligt code-summary.
