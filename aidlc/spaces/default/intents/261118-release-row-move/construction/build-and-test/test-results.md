# Test Results: US-0029 release row move

Run 2026-11-18 on branch `fix/US-0029`.

| Command | Exit | Result |
|---|---|---|
| `npx electron-vite build` | 0 | main, preload and renderer built |
| `npx vitest run tests/ --coverage` | 0 | 148 files, 1883 passed, 0 failed; thresholds met |
| `npx prettier --check src tests docs` | 0 | clean |
| `npx eslint .` | 0 | 0 errors, 29 warnings (all `react-hooks/exhaustive-deps` in files this fix does not touch) |

The unit-test command in `unit-test-instructions.md` (`tests/main/releasesPlan.test.js tests/main/releases.test.js`) selects files of the full suite, so the full run covers it.

## Coverage (v8, lines)

All files 92.3% (floor 80%). `src/main/releases.js` 95.08%, `src/main/parsers/releases.js` 100%.

## Failures

None.

## Efter merge med main

- **Vad som var fel:** PR #75 krockade med main efter att PR #74 (US-0028) mergats. Konflikter i `intents.json`, `docs/FEATURES.md`, `docs/features/epic-00-fixes.md` och `docs/releases/0.2.10.md`.
- **Orsak:** båda storys uppdaterade samma statusrader och la till sin intent sist i `intents.json`.
- **Åtgärd:** origin/main mergad in i `fix/US-0029`; båda intents behölls i `intents.json`, och statusraderna visar US-0028 och US-0029 som ✅ klara. Ingen kod krockade.
- **Nya resultat:** 148 testfiler / 1886 tester gröna, ESLint 0 fel (29 varningar), Prettier rent.
- **Lärdom:** två fixar i samma epic krockar alltid på statusraderna; räkna med en docs-merge.
