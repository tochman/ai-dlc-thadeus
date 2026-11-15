# Kodsammanfattning — EPIC-03 Audit Timeline

Underlag: `requirements.md` för den här intenten och kodbaskunskapen `aidlc/spaces/default/codekb/aidlc-dash/`.

## Ändrade och nya filer

- **`package.json` och `package-lock.json`:** `@tanstack/react-virtual` `3.14.24` (exakt version). Den drar med sig `@tanstack/virtual-core` `3.19.9`.
- **`src/main/parsers/audit.js`:**
  - `parseAudit` ger varje händelse `index` och `key` (`<källa>#<index>`).
  - `mergeAudits` sorterar på `timeMs` (`Date.parse`), sedan källa och sedan index. En händelse utan tid ärver föregångarens tid i samma fil.
- **`src/renderer/useProject.js`:** `newKeys` ersätter `newSeqFrom`. Värdet bygger på en jämförelse av nycklar, och timern i en ref rensas vid byte av intent och vid avmontering. `ProjectView.jsx` och `IntentDetail.jsx` skickar `newKeys` vidare.
- **`src/renderer/Timeline.jsx`:**
  - virtualiserad med `useVirtualizer` och utan tak
  - `visible` beräknas med `useMemo`
  - utfällda rader sparas som ett `Set` av nycklar
  - knapparna "Till senaste" och "Till stage-start…"
  - scrollankring på den översta synliga raden
  - räknaren "N nya händelser" och etiketten "ny" på nya rader
  - `role="list"`/`listitem` med `aria-setsize` och `aria-posinset`
  - piltangenterna samt Home och End flyttar fokus
- **`src/renderer/theme.css`:** stilar för scrollbehållaren, räknaren och etiketten "ny".
- **Tester:**
  - `tests/main/parsers.test.js` (+3)
  - `tests/renderer/Timeline.test.jsx` (4, ny)
- **Dokument:** `docs/features/epic-03-audit-timeline.md` och `docs/FEATURES.md`.

## Viktiga beslut

- **Scrollankring:** listan håller fast den rad som ligger överst i bild (nyckel och avstånd), inte antalet nya rader ovanför. Det fungerar även när ett filter ändras. Webbläsarens egen ankring är avstängd (`overflow-anchor: none`).
- **"Till stage-start":** stages tas från händelsernas `Stage`-fält, eftersom tidslinjen bara får händelser.
- **Scrollbehållarens höjd:** `max-height: calc(100vh - 280px)` och `min-height: 240px`.

## Testtäckning

- 68/68 gröna, varav 7 nya. Bygget går igenom.
- Under granskningen fallerade ett test en gång av fem körningar och var grönt igen vid omkörning. Det är troligen watcher-testet, som är beroende av macOS FSEvents (känt sedan EPIC-02). Det följs upp i Build and Test.
- **NFR1 (indikativt, i jsdom):** 20 000 händelser gav 26–46 ms per filterändring och 27 renderade rader.

## Inte verifierat i det här steget

- Prestanda och jämn scrollning i riktig Electron med 20 000 händelser.
- Scrollankring, tangentbordsfokus och att ett klick på räknaren flyttar scrollen. jsdom saknar layout.
- a reference project's `epic02-finish` med 1 726 händelser.

## Avvikelser från planen

- Scrollankringen följer den översta synliga raden i stället för att räkna nya rader ovanför. Resultatet är detsamma, men den är robustare.
- Två mätfiler ligger kvar i `tests/.tmp/` (git-ignorerade).
