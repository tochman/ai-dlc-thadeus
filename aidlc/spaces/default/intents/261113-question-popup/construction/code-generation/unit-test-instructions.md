# Instruktioner för enhetstester — EPIC-05 US-0505

## Ramverk

Testerna körs med Vitest 5.1 och den befintliga `vitest.config.mjs`: Node för `tests/main/**` och jsdom för `tests/renderer/**/*.test.jsx`.

## Körning (bara den här leveransens tester)

```bash
npx vitest run tests/main/questions.test.js tests/main/settings.test.js tests/renderer/QuestionPopup.test.jsx
```

Kör sedan hela sviten med `npx vitest run tests/` som regressionskontroll: 101 befintliga och cirka 10 nya tester, alla gröna.

## Omfång (Minimal)

| Fil | Tester | Krav |
|-----|--------|------|
| `tests/main/questions.test.js` | 6: obesvarad fråga, svar, stängd grind, ny start, Options-tolkning, annan stage | FR1.2, FR1.3, NFR2 |
| `tests/main/settings.test.js` | +1: `questionAlerts` och `notificationSound` | FR4.1 |
| `tests/renderer/QuestionPopup.test.jsx` | 3: innehåll och "Svara i Claude", eskalering efter 20 s, grind | FR2.2, FR2.3, FR2.5, NFR5 |
| alla befintliga | oförändrade förväntningar | NFR4 |

## Mockning

- `pendingQuestions` är ren och testas med handskrivna händelser i samma form som `loadAuditEvents` ger: `event`, `fields`, `timeMs`, `seq`, `key`.
- I popuptestet används `vi.useFakeTimers()` för de 20 sekunderna. `HTMLDialogElement.showModal` mockas i jsdom, som i de befintliga dialogtesterna.

## Manuell verifiering (Build and Test)

Testas i riktig Electron med ett projekt där en ny `DECISION_RECORDED` läggs till i en kopia av en audit-shard i sandlådan:
- popupen visas
- eskaleringen kommer efter 20 s
- "Svara i Claude" öppnar rätt flik
- popupen stängs när svaret läggs till
- notisen visas när fönstret saknar fokus
