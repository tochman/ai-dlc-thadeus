# Prestandatester — EPIC-02

Underlag: `requirements.md` NFR1 (under 300 ms).

Mätt mot a reference project's riktiga ledger: läsning 5,8 ms, `summarizeLedger` 6,5 ms kall och 2,3 ms varm. Livehändelse efter ny ledger: 321 ms inklusive debounce (300 ms). Inga separata lasttester behövs för Minimal-strategin.
