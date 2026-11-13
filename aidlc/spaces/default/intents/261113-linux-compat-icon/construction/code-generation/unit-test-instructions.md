# Instruktioner för enhetstester — Bugfix: Linux 22.04 och appikon

## Ramverk

Vitest 5.1, med den befintliga `vitest.config.mjs`: projektet `node` för `tests/main/**`. Ingen ny konfiguration behövs, och kommandot fungerar redan före första ändringen.

## Körning (bara den här rättelsens tester)

```bash
npx vitest run tests/main/pty.test.js tests/main/check-glibc.test.js tests/main/icon.test.js
```

Hela sviten, för regressionskontroll (NFR2), körs separat med `npx vitest run tests/`. Den ska ge 26 gröna tester: 20 befintliga och 6 nya.

## Omfång (Minimal + bugfix-golv)

| Fil | Tester | Krav |
|-----|--------|------|
| `tests/main/pty.test.js` | 3. Regressionstest: inkompatibel modul ger ett svenskt fel och kill-funktionerna kastar inte. Nytt laddningsförsök efter fel. Import av `pty.js` laddar inte `node-pty`. | FR2.1–FR2.3, R-01, R-02 |
| `tests/main/check-glibc.test.js` | 2: versionsavläsning, och överträdelser för glibc och prebuilds | FR1.2, FR1.3, R-03 |
| `tests/main/icon.test.js` | 1: `build/icon.png` är en PNG på 1024×1024 med alfakanal | FR3.1, FR3.5 |

## Täckning

Det finns inget golv för radtäckning (bugfix och Minimal). Varje ny komponent (`pty.js`-laddningen, `check-glibc.mjs`, ikonfilen) har minst ett test för det lyckade fallet.

## Mockning

- `node-pty` mockas med `vi.doMock` och `vi.resetModules()` mellan fallen. Testerna startar inga riktiga terminalprocesser.
- `checkDir` testas mot syntetiska filer i `tests/.tmp/` (git-ignorerad), som skapas och tas bort av testet.

## Manuell verifiering (Build and Test och release)

- CI: `build-linux` på `ubuntu-22.04` med en grön glibc-kontroll.
- Ikonen syns i Dock, Finder och `.dmg` (macOS) och i startmenyn (Linux). Designen stäms av med användaren.
- `.deb` för v0.1.1 installeras och startar på användarens Ubuntu 22.04.
