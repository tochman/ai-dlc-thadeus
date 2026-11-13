# Kravanalys — frågor EPIC-06 Feature Docs

Underlag: `docs/features/epic-06-feature-docs.md` (US-0601, US-0602) och den fokuserade skanningen i `aidlc/spaces/default/codekb/aidlc-dash/`. Skanningen visar fyra saker:

- Appen har ingen vyväxling, ingen projektmeny och ingen inställningsvy.
- `docs/` bevakas inte.
- Det finns inget sätt att lista filer i en mapp.
- Ett projekt utan `aidlc/spaces/` visar bara uppsättningsskärmen.

## Fråga 1 — Var ska Features-vyn ligga? (US-0602)

A. En växel högst upp i projektvyn, "Intents | Features". Vyn med Features ersätter då sidofältet och innehållsytan, och terminalen ligger kvar.
B. En egen flik i sidofältet bredvid intent-listan. Detaljerna visas då i innehållsytan.
X. Other (please specify)

[Answer]: A

## Fråga 2 — Var ska inställningen "Feature-beskrivningar" ligga? (US-0602)

A. En kugghjulsknapp på projektfliken öppnar en liten dialog, "Projektinställningar". Där väljer man Automatiskt, Visa eller Dölj och kan ange en sökväg. Dialogen kan senare få fler inställningar.
B. Direkt i Features-vyns huvud. Den syns då bara när vyn syns, och Dölj gör den svår att hitta tillbaka till.
X. Other (please specify)

[Answer]: A

## Fråga 3 — Ska Features visas för projekt som inte använder AI-DLC? (US-0602)

A. Ja. Om `docs/FEATURES.md` finns visas växeln "Uppsättning | Features" även på uppsättningsskärmen.
B. Nej. Features visas bara i AI-DLC-projekt.
X. Other (please specify)

[Answer]: A
