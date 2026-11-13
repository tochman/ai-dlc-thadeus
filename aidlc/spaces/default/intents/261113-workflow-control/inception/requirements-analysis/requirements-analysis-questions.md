# Kravanalys — frågor EPIC-05 Workflow Control

Underlag:

- `docs/features/epic-05-workflow-control.md` (US-0501, US-0502, US-0503)
- kodbaskunskapen `aidlc/spaces/default/codekb/aidlc-dash/`
- skanningens fynd: inget sätt att veta om Claude är ledig, ingen git-kod, AI-DLC upptäcks bara när projektet öppnas

## Fråga 1 — Hur vet appen att Claude är redo för nästa kommando? (US-0501)

US-0501 ska skriva två kommandon i rad för en intent som inte är aktiv (`/aidlc intent <dirName>` och sedan `/aidlc`). Den får heller inte skriva in något medan Claude arbetar. Terminalen har i dag ingen signal för om Claude är ledig.

A. Tystnad: Claude räknas som ledig när terminalen inte har skrivit ut något på 1,5 s och inget fortfarande strömmar. Nästa kommando skickas automatiskt.
B. Bekräftelse: appen skriver kommandot men trycker inte Enter. Du trycker Enter själv för varje kommando, så det kan aldrig hamna mitt i något.
C. Kombination: kommandot för att byta intent skickas direkt när Claude är tyst (A). `/aidlc` skrivs sedan utan Enter, och du bekräftar det.
X. Other (please specify)

[Answer]: C

## Fråga 2 — Hur hämtar "Hämta in" ändringarna från GitHub? (US-0502)

A. `git pull --rebase --autostash`: dina lokala commits läggs ovanpå de hämtade, och osparade ändringar parkeras och läggs tillbaka automatiskt. Historiken blir linjär.
B. `git pull --no-rebase --autostash`: ändringarna slås ihop med en merge-commit. Det är säkrare om grenen redan är pushad och delas med andra.
C. Appen frågar varje gång och visar båda alternativen.
X. Other (please specify)

[Answer]: C

## Fråga 3 — Hur ofta kontrollerar appen GitHub? (US-0502)

A. Var 5:e minut, och när appfönstret får fokus. Detta görs med `git fetch` i bakgrunden, vilket aldrig ändrar dina filer.
B. Bara när fönstret får fokus, och när du trycker "Uppdatera".
C. Bara när du trycker "Uppdatera".
X. Other (please specify)

[Answer]: C

## Fråga 4 — Ingår uppdateringar av själva AI-DLC-ramverket (`.claude/`) i US-0502?

A. Nej. Det blir en egen story senare. US-0502 visar bara ändringar under `aidlc/` och nämner andra ändrade filer i en rad.
B. Ja. Även ändringar i `.claude/` visas och hämtas in.
X. Other (please specify)

[Answer]: A
