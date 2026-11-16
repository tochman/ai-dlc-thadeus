# Unit Test Instructions: US-1201

## Ramverk

Appen använder vitest 5.1.0 med två projekt, `main` (node) och `renderer` (jsdom, svensk locale), redan uppsatta i `vitest.config.mjs`. Inget nytt att installera.

## Körbart före första Red-steget

```bash
npx vitest run tests/main/git.test.js
```

## Den här storyns tester

```bash
npx vitest run tests/main/platforms.test.js tests/main/credentials.test.js tests/main/git.test.js tests/main/teamActivity.test.js tests/main/storyComments.test.js tests/main/ipc.test.js tests/renderer/CollisionPanel.test.jsx tests/renderer/MachinesView.test.jsx tests/renderer/StoryComments.test.jsx tests/renderer/RefreshPanel.test.jsx tests/renderer/SettingsView.test.jsx tests/main/i18nKeys.test.js
```

Strategin är Standard: 5–8 tester per komponent, cirka 45 nya totalt.
- **Enhetstester:** plattformsigenkänning, tolkning, inloggningsuppgifter, korsning av krockar, kommentarer per story och vyerna.
- **Integrationstester för gränserna:**
  - git-funktionerna mot riktiga repon i `tests/.tmp/`, med ett bart "origin" och två kloner;
  - IPC-kanalerna.

## Täckning

Golvet på 80 % radtäckning gäller hela projektet. Build and Test kontrollerar det på hela sviten (`npx vitest run tests/ --coverage`). En avgränsad körning bedömer det inte.

## Mockning och testdata

- **Plattformar:** inget nätverk i testerna.
  - `gh` och `glab` stubbas genom `exec`.
  - `fetch` stubbas med `vi.stubGlobal`.
  - Svaren kommer från fixturer i `tests/fixtures/platforms/`, en per plattform, byggda efter respektive API:s dokumenterade form.
- **`safeStorage`:** mockas med `vi.mock('electron')`. Testerna kontrollerar att klartext aldrig hamnar på disk.
- **Git:** testerna skapar egna repon i `tests/.tmp/` och städar efter sig.
- **Audit-shards:** fixturerna i `tests/fixtures/cost/` och `tests/fixtures/audit/` återanvänds.
