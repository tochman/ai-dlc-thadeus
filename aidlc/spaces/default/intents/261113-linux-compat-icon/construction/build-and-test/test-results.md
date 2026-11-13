# Testresultat — Bugfix Linux 22.04 och appikon (v0.1.1)

Körda 2026-11-13.

## Enhetstester (Node och jsdom)

| Kommando | Exit | Resultat |
|----------|------|----------|
| `npx vitest run tests/main/pty.test.js tests/main/check-glibc.test.js tests/main/icon.test.js` (från unit-test-instructions.md) | 0 | 6/6 |
| `npx vitest run tests/` (hela sviten, regression) | 0 | 9 filer, 26/26 gröna |

Inget täckningsgolv gäller (bugfix och Minimal).

## Bygge lokalt (macOS x86_64)

| Kommando | Exit | Resultat |
|----------|------|----------|
| `npm run build:mac` | 0 | `dist/Auctum AIDLC Control-0.1.1-universal.dmg`. Loggen saknar "default Electron icon is used". |
| Kontroll av appen | — | `CFBundleIconFile` = `icon.icns` och `CFBundleShortVersionString` = `0.1.1`. `iconutil` visar storlekarna 16–512 och @2x i icns-filen. 64 px-versionen är kontrollerad visuellt. |
| Start av den paketerade appen | — | Körs i 7 s utan krasch |

## CI på GitHub Actions (PR #4)

| Körning | verify | build-mac | build-linux (ubuntu-22.04) | release |
|---------|--------|-----------|----------------------------|---------|
| 43393997381 | success | success | success | skipped (ingen tagg) |
| 43394678127 (efter rättelsen av Linux-ikonerna) | success | success | success | skipped |

- **glibc-kontrollen i build-linux:** `OK: inga binärer i dist/linux-unpacked kräver mer än glibc 2.35 / GLIBCXX_3.4.30.`
- **Den nedladdade `.deb` (`aidlc-dash_0.1.1_amd64.deb`, 106 MB):**
  - `pty.node` kräver högst `GLIBC_2.34`. I v0.1.0 var det `GLIBC_2.42`.
  - Inga node-pty-prebuilds för `darwin-*` eller `win32-*` finns med (FR1.3).
  - `usr/share/icons/hicolor/{16,24,32,48,64,128,256,512}x…/apps/auctum-aidlc-control.png` finns, och `.desktop` har `Icon=auctum-aidlc-control`.

## Fel som hittades och rättades i steget

1. **Linux-ikonen fanns bara i 1024×1024.** Den första CI-körningens `.deb` innehöll bara `hicolor/1024x1024`. Ubuntus hicolor-tema slår normalt upp storlekar upp till 512 px, och FR3.3 kräver 16–512.
   - Rättat inom byggskriptens ansvar: `scripts/make-icon.cjs` skriver nu också `build/icons/NxN.png`, och `linux.icon` pekar på `build/icons`.
   - Verifierat i körning 43394678127.
2. **Linux-bygget kunde bara provas vid en tagg.** `release.yml` körs nu också på pull requests med test och bygge men utan publicering. Taggkontrollen och `release` körs bara på taggar.

## Inte verifierat här

- Installation och start av `.deb` på Ubuntu 22.04. Ingen Linux-maskin finns här, och det görs på användarens maskin efter release.
- Att ikonen syns i Dock och startmeny på en installerad release (US-0401). Det görs efter release.
- Att ett misslyckat laddningsförsök görs om i en riktig Electron-process (R-01 från kodgranskningen). Det är bara bevisat med mock. Risken är accepterad, eftersom glibc-felet är permanent.
