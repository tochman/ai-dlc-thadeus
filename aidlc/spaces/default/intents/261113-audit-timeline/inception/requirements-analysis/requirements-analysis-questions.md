# Kravanalys — frågor EPIC-03 Audit Timeline

Underlag: `docs/features/epic-03-audit-timeline.md` (US-0301, US-0302) och den fokuserade skanningen i `aidlc/spaces/default/codekb/aidlc-dash/`. Enligt skanningen:

- Tidslinjen klipper vid 1 500 rader och renderar allt utan virtualisering.
- "Nytt" avgörs av antalet händelser.
- `seq` används som nyckel.
- Tidsstämplar sorteras som text.

## Fråga 1 — Hur ska virtualiseringen byggas? (US-0301)

Raderna har olika höjd, eftersom en händelse kan fällas ut och visa detaljer.

A. `@tanstack/react-virtual` (cirka 5 kB, välunderhållet och utan andra beroenden). Det hanterar varierande radhöjd och mätning av utfällda rader. Det enda nya beroendet.
B. Egen fönstring. Inga nya beroenden, men vi måste själva mäta varierande höjder och hantera scrollankring (cirka 150 rader kod plus tester).
X. Other (please specify)

[Answer]: A

## Fråga 2 — Vilken stabil nyckel ska identifiera en händelse? (US-0302)

A. Källfil plus blockets position i filen (`<shard>#<index>`). Audit-filerna växer bara i slutet, så nyckeln är exakt och billig att räkna fram.
B. Hash av tidsstämpel, händelse och fält. Den klarar även om en fil skulle skrivas om, men två identiska händelser i samma sekund får samma nyckel.
X. Other (please specify)

[Answer]: A
