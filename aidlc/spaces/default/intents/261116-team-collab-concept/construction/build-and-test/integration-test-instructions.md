# Integration Test Instructions: US-1201

Strategin Standard ger integrationstester vid de viktiga gränserna. De här körs med resten av sviten i vitest. De behöver varken nätverk eller riktiga konton.

## Gränser och var de testas

| Gräns | Test | Hur |
|---|---|---|
| Appen och git | `tests/main/git.test.js` | Riktiga repon i `tests/.tmp/`: ett bart "origin" och två kloner. Testerna prövar `behindCount`, `changedFiles` och `predictConflicts`, och att HEAD, status och stash är orörda efteråt |
| main och renderer (IPC och bryggan) | `tests/main/ipc.test.js`, `tests/main/preload.test.js` | Kanalerna `team:*` och `credentials:bitbucket`, deras svarsformer, fel som värden, och att lösenordet aldrig kommer tillbaka |
| Appen och plattformarnas API:er | `tests/main/platforms.test.js` | `gh api` och `glab api` stubbas genom `exec`, och Bitbucket genom `fetch`. Svaren kommer från fixturer i `tests/fixtures/platforms/` |
| Appen och nyckelringen | `tests/main/credentials.test.js` | `safeStorage` mockas. Testerna visar att klartext aldrig hamnar på disk |

## Körning

```bash
npx vitest run tests/main/git.test.js tests/main/ipc.test.js tests/main/preload.test.js tests/main/platforms.test.js tests/main/credentials.test.js
```

## Inte täckt här

Riktiga anrop mot GitHub, GitLab och Bitbucket, och den riktiga nyckelringen i macOS och Linux, prövas för hand i den byggda appen före releasen. Se `test-results.md`.
