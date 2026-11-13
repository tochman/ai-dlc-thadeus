# Bygginstruktioner — v0.1.1

Underlag: `construction/code-generation/code-generation-plan.md`, `unit-test-instructions.md` och `code-summary.md`.

## Lokalt (macOS)

```bash
npm ci                 # bygger om node-pty för Electron
npx vitest run tests/  # 26 tester
npm run build:mac      # dist/Auctum AIDLC Control-0.1.1-universal.dmg
npm run icon           # bara om build/icon.svg ändras: skriver build/icon.png och build/icons/16..512
```

## Linux (.deb)

Linux kan inte byggas på macOS, eftersom node-pty måste kompileras mot målsystemets glibc. Linux-bygget görs i GitHub Actions på `ubuntu-22.04`:

- Vid varje pull request mot `main` körs `verify`, `build-mac` och `build-linux` (inklusive glibc-kontrollen), men ingenting publiceras.
- När en tagg `vX.Y.Z` pushas körs samma jobb, och `release` publicerar `.dmg` och `.deb`.

Manuellt på en Linux-maskin med glibc 2.35 eller äldre:

```bash
npm ci && npm run build:linux && node scripts/check-glibc.mjs dist/linux-unpacked
```

## Verifiera

- `npm run build:mac` får inte längre ge varningen "default Electron icon is used". `Contents/Resources/icon.icns` ska finnas.
- `check-glibc.mjs` ska skriva `OK: inga binärer i dist/linux-unpacked kräver mer än glibc 2.35 / GLIBCXX_3.4.30.`

## Felsökning

- **glibc-kontrollen fallerar:** Linux-bygget har körts på en för ny runner eller maskin. Kör det på `ubuntu-22.04`.
- **Ikonen saknas i Linux-menyn:** Kontrollera att `build/icons/` finns och innehåller storlekarna 16–512, och att `linux.icon` pekar dit.
