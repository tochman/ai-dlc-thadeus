# Testresultat — EPIC-02 Kostnad och modeller

Underlag: `construction/code-generation/code-generation-plan.md`, `unit-test-instructions.md` och `code-summary.md`.

## Enhetstester och bygge

| Kommando | Exit | Resultat |
|----------|------|----------|
| `npx vitest run tests/` | 0 | 12 filer, 39/39 gröna (efter loop-back 1) |
| `npx electron-vite build` | 0 | Bygget lyckades |

## Kontroll i riktig Electron (Chromium) mot `a reference project`

| Kontroll | Resultat |
|----------|----------|
| Projektpanelen (FR3, FR6) | "KOSTNAD $1158.86*". Asterisken betyder att totalen är ofullständig, eftersom `claude-haiku-5-5` saknar pris (FR6.2). |
| Kostnad per intent i listan (FR1.2) | t.ex. `epic29-status-order $20.66`, `epic29-small-k2-fixes $23.80` |
| Sortering på kostnad (FR1.6) | Fungerar. Ordningen blir `peppol-e-invoicing`, `epic02-finish`, `epic36-status-review`. |
| Fliken Kostnad (FR1.3, FR2, FR6.1) | "UPPSKATTAD KOSTNAD (API-PRIS) $287.57" med tokens uppdelade på input, output, cache write och cache read |
| Konfigurerade modeller (FR4.1) | `source: aidlc-config` med 14 agenter, t.ex. architecture-reviewer `sonnet`/`medium` |
| Livekostnad: ledger skapad efter öppning (FR5.1) | `costChanged` efter 321 ms, kostnaden blir tillgänglig (efter loop-back 1) |
| Konsolfel i renderaren | 0 |

## Fel

### F-01 (rättad i loop-back 1): En ledger som skapas efter att projektet har öppnats plockas inte upp (FR5.1)

- **Repro:** Öppna ett projekt utan `aidlc/.aidlc-sessions/usage-ledger.json` och skapa sedan filen. Ingen händelse med `costChanged` kommer inom 3 s, och kostnaden visas inte förrän projektet öppnas igen.
- **Orsak:** `src/main/watcher.js` ger chokidar den exakta filsökvägen. chokidar v4 bevakar inte en fil eller en föräldermapp (`.aidlc-sessions/`) som inte finns när bevakningen startar.
- **Ansvarigt steg:** code-generation (genererad källkod), inte testkonfigurationen i det här steget.
- **Förslag:** bevaka mappen `aidlc/` med `depth: 1` och filtrera på ledgerns sökväg. Då märks både när `.aidlc-sessions/` skapas och när filen skapas eller ändras. Ett test för fallet "ledgern skapas efter start" läggs till i `tests/main/watcher.test.js`.
- **Uppskattad påverkan:** ca 15 rader kod och 1 test. Ingen kostnad. Låg risk, eftersom bara watcher.js ändras och bevakningen av intents är oförändrad.

## Loop-Back Log

### Loop-back 1 — 2026-11-13T09:31:06Z
- **Diagnosis:** F-01. `src/main/watcher.js` bevakar `usage-ledger.json` som en exakt sökväg. chokidar v4 märker inte en fil, eller dess föräldermapp `aidlc/.aidlc-sessions/`, som skapas efter att bevakningen startat.
- **Root-cause stage:** code-generation
- **Planned fix:** bevaka `aidlc/` med `depth: 1` och filtrera på ledgerns sökväg (`costChanged`). Lägg till ett test i `tests/main/watcher.test.js` där ledgern skapas efter att bevakningen är redo.
- **Estimated impact:** effort ca 15 rader och 1 test. Ingen finansiell kostnad. Låg risk, eftersom bara watcher.js berörs. Användaren valde "Retry with fix".
