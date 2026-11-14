# Deployment Log — US-0405 Inställningar som vy

**Datum:** 2026-11-14 · **Intent:** `261114-settings-view` · **Utfall:** **förberedd, inte driftsatt** (ingen tagg satt — väntar på besked)

## Vad som gjordes

| # | Steg | Utfall |
|---|------|--------|
| 1 | Läste `cd-config.md`, `deployment-strategy.md`, `test-results.md` | inga motsägelser; pipelinen oförändrad |
| 2 | Förkontroller (se `health-check-report.md`) | alla gröna |
| 3 | Dokumentuppdatering per projektmandatet | se nedan |
| 4 | Hälsokontroll av artefakten lokalt | grön |
| 5 | Tagg, CI-bygge, GitHub Release | **inte utfört** — driftfönstret är inte beslutat |
| 6 | Rökprov på installerad release | **inte utfört** — kräver steg 5 |

## Dokumentuppdatering (projektmandatet)

Fyra saker uppdaterade för storyn:

1. **Storyns statusmarkör** — `docs/features/epic-04-branding-and-desktop.md`: `🚧 In progress (v0.2.3)` → `✅ Done (ships in v0.2.3, intent \`261114-settings-view\`)`.
2. **Acceptanskriterier** — alla åtta kryssade (`- [x]`) i US-0405, med en kursiv verifieringsrad som säger vad som bevisades här (36 avgränsade tester, 224 i hela sviten, `electron-vite build`) och att de inbyggda filväljarna samt "sparad sökväg används vid nästa start" verifieras på installerad release vid taggen.
3. **Epicens statusrad** — `**Status (2026-11-14):**` i samma fil: US-0405 står nu som "✅ done, ships in v0.2.3 … marked 'Released in v0.2.3' when the tag is cut".
4. **`docs/FEATURES.md`** — EPIC-04-raden: `🚧 US-0405 In progress for v0.2.3 (settings view)` → `✅ US-0405 done for v0.2.3 (settings view)`.

Storyn står inte kvar som pågående, vilket mandatet kräver. Märkningen "Released in v0.2.3" läggs på vid taggen, enligt samma mandat.

## Vad som återstår innan releasen

| Uppgift | Vem | Var |
|---------|-----|-----|
| Besluta driftfönster och tagga `v0.2.3` (efter alla fyra stories) | personen | `docs/releases/0.2.3.md`, releasechecklistan |
| Bumpa `package.json` till `0.2.3` | releaseägaren | — |
| Köra det nio punkters rökprovet på installerad release | personen | `deployment-strategy.md` |
| Stänga US-0401 (installerad release macOS/Linux) och US-0301 (renderingstid i riktig Electron) | personen | `docs/releases/0.2.3.md`, "Open criteria" |
| Märka storyn "Released in v0.2.3" | releaseägaren | epic-filen + `FEATURES.md` |

## Proveniens

| Fält | Värde |
|-------|-------|
| Källkod | `main`, ocommittad arbetskopia (inget commit gjordes i det här arbetet) |
| Byggd artefakt | `out/` från `npx electron-vite build`, exit 0 |
| Testunderlag | `construction/build-and-test/test-results.md` |
| Beroenden | oförändrade; inga nya npm-paket (C5) |

## Rullning tillbaka

Se `operation/deployment-pipeline/rollback-runbook.md`. I det här läget (inget driftsatt) räcker `git checkout -- .` och `git clean -fd` för de nya filerna, eftersom inget utanför repot skrivits.
