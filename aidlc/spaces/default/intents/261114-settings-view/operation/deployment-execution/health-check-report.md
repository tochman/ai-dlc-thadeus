# Health Check Report — US-0405 Inställningar som vy

En skrivbordsapp har inga SLO:er, inga hälsometriker och ingen lastbalanserare. Den här rapporten är därför den lokala motsvarigheten: en förkontroll av artefakten och av uppgraderingsvägen, körd 2026-11-14 innan någon tagg satts.

## Förkontroller

| Kontroll | Förväntat | Utfall |
|----------|-----------|--------|
| Bygget går igenom från källkoden | `npx electron-vite build` exit 0 | **OK** — main 167 kB, preload 2,8 kB, renderer 2,1 MB + 71 kB CSS |
| Hela testsviten grön | 0 fel | **OK** — 45 filer / 224 tester |
| Storyns avgränsade svit grön | 0 fel | **OK** — 6 filer / 36 tester |
| Alla spårade krav täckta | 24/24 | **OK** — `sensor-traceability --stage build-and-test` → `pass: true` |
| Inga nya npm-beroenden | 0 | **OK** — `package.json` oförändrad (C5) |
| Inga nya native-moduler eller ändrad `electron-builder.yml` | 0 | **OK** |
| Releaseworkflowen oförändrad och komplett | test → bygge → release | **OK** — `.github/workflows/release.yml` orörd |
| Ingen skrivning utanför `settings.json` | bara userData | **OK** — `settings.js`, `tools.js`, `ipc.js`; inget projekt rört (FR7.2) |
| Inga hemligheter eller hårdkodade sökvägar i koden | 0 | **OK** — sökvägar kommer från inställningar eller `PATH` |

## Uppgraderingsväg (från v0.2.2)

| Fråga | Svar |
|-------|------|
| Förlorar en befintlig användare något? | **Nej.** `userData` heter fortfarande `aidlc-dash`; `openProjects`, `recentProjects`, `activeProject`, `projectSettings`, `animations`, `fullscreen`, `questionAlerts`, `notificationSound`, `language` läses som förut |
| Vad händer med en gammal `settings.json`? | Nya nycklar saknas → `sanitize()` ger inga värden → alla tre verktyg hittas automatiskt, standardmappen är tom. Exakt v0.2.2-beteende |
| Vad händer med en korrupt `settings.json`? | `sanitize()` släpper igenom bara giltiga värden; resten faller till standard (befintligt beteende) |
| Försvinner något gränssnitt? | Den gamla dialogen är borta; samma fem inställningar finns under **Utseende**, plus sektionerna Verktyg, Projekt och Om |
| Krävs omstart efter uppgradering? | Ja, den nya versionen startas om vid installation; en ändrad verktygssökväg gäller **nästa** start av det verktyget (FR2.5) |
| Påverkas öppna projekt? | Nej. Projektmappar läses som förut, inget skrivs i dem |

## Vad som inte kan hälsokontrolleras förrän vid taggen

- Att den byggda `.dmg`/`.deb` faktiskt startar på macOS respektive Ubuntu 22.04+.
- Att macOS släpper igenom det osignerade bygget efter att användaren tillåtit det.
- Att den inbyggda filväljaren öppnar rätt katalog och att en vald sökväg överlever en omstart av appen.

Dessa står som punkt 1–9 i `smoke-test-results.md` och körs vid taggen. Inget av dem är känt trasigt — de är helt enkelt inte körda.

## Bedömning

**Frisk för releaseberedskap.** Inga blockerande fynd. Storyn är byggd, testad och dokumenterad; kvar är driftfönstret, taggen och rökprovet på installerad release.
