# Requirements Analysis — frågor (EPIC-02 Kostnad och modeller)

Underlag:
- `docs/features/epic-02-cost-and-models.md` (US-0201–US-0205)
- kodbas-kunskapen `aidlc/spaces/default/codekb/aidlc-dash/` (`business-overview.md`, `architecture.md`, `code-structure.md`)

Verifierat mot a reference project:
- `usage-ledger.json` grupperar workflows som `intent:<uuid>`, med samma uuid som i `intents.json`.
- Körningar från före uuid-tiden ligger under `record:default/legacy`.
- Varje nod har `tokens` (input, output, cacheCreate5m, cacheCreate1h, cacheRead) och `usd`.

## Q1. [Utvecklare] Hur ska appen ta reda på vilken modell varje agent är konfigurerad för (US-0204)?

Appen startar i dag inga program utom terminalerna. Att köra `aidlc config models` är en ny förmåga i huvudprocessen.

A. Kör `aidlc config models --show --json --harness claude` i projektroten. Argumenten är fasta, inget skal används, timeout 10 s, och kommandot är bara läsande. Om det misslyckas används `model:` i agentfilerna (`.claude/agents/aidlc-*-agent.md`).
B. Läs bara `model:` i agentfilerna, utan att köra något kommando. Det är enklare, men visar inte projekt- eller maskininställningar.
C. Visa bara de faktiska modellerna från ledgern och hoppa över den konfigurerade modellen.
X. Other (please specify)

[Answer]: A

## Q2. [Produkt] Ska CSV-exporten (US-0203) med i den här omgången?

Den blir appens andra skrivning till disk. I dag skriver appen bara sina egna inställningar.

A. Ja. Exporten sparas via en sparadialog där användaren väljer fil, och inget skrivs utan användarens val.
B. Inte nu. Exporten skjuts till en senare omgång.
X. Other (please specify)

[Answer]: B

## Q3. [Produkt] I vilken valuta ska den uppskattade kostnaden visas?

Ledgern anger bara USD (API-pris).

A. Bara USD, som ledgern anger
B. USD och SEK, där växelkursen anges manuellt i appens inställningar och visas som ungefärlig
X. Other (please specify)

[Answer]: A

## Q4. [Design] Var ska kostnadsöversikten för hela projektet (US-0203) ligga?

US-0202 lägger redan en fliken "Kostnad" i intent-detaljvyn. Frågan gäller projektöversikten.

A. En egen vy "Projekt", som visas när ingen intent är vald eller via en knapp ovanför intent-listan
B. En hopfällbar panel överst i intent-listan med totalsumma och fördelning
X. Other (please specify)

[Answer]: B
