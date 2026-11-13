# Smoke-test — v0.1.0

Testat på de filer som faktiskt publicerades. De hämtades med `gh release download v0.1.0` till en tillfällig mapp, som togs bort efteråt. Testet gjordes på macOS x86_64.

## macOS (`Auctum.AIDLC.Control-0.1.0-universal.dmg`)

| Kontroll | Resultat |
|----------|----------|
| `.dmg` monteras (`hdiutil attach`) | OK |
| Arkitekturer i appens binär (`lipo -archs`) | `x86_64 arm64`, alltså universal |
| `CFBundleIdentifier` | `se.auctum.aidlc-control` |
| node-pty utanför asar | `pty.node` och `spawn-helper` finns i `app.asar.unpacked/.../build/Release/` |
| Appen startar från den monterade `.dmg`:en | Körs efter 8 s utan att krascha |
| Startskärm, flikar, vyer och terminal | Inte omtestat på release-filen. Samma kod är verifierad i Electron i Build and Test (startskärm, sidhuvud, intent-lista, pipeline, tidslinje, DAG, shell-flik, sökvägsskydd). |
| Apple Silicon (arm64) | Inte provkört, eftersom ingen arm64-Mac fanns tillgänglig. arm64-delen finns i binären. |

## Linux (`aidlc-dash_0.1.0_amd64.deb`)

| Kontroll | Resultat |
|----------|----------|
| Paketmetadata | `Package: aidlc-dash`, `Version: 0.1.0`, `Architecture: amd64`, `Maintainer: Auctum Solutions AB <info@auctum.se>` |
| Beroenden | libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0 |
| Körbar fil | `/opt/Auctum AIDLC Control/auctum-aidlc-control` |
| Programmenypost | `/usr/share/applications/auctum-aidlc-control.desktop` |
| node-pty byggd för Linux | `build/Release/pty.node` är ELF 64-bit x86-64 |
| Installation och start på Linux | **Inte provat.** Ingen Linux-maskin fanns tillgänglig. Paketet byggdes och node-pty kompilerades på Ubuntu i CI. |

## Slutsats

Båda filerna är kompletta och har rätt struktur, och macOS-appen startar. Det enda som inte är provkört är installation och start på Linux och på Apple Silicon. Det rekommenderas att någon med en sådan maskin kör de fyra stegen i `rollback-runbook.md` § Smoke-test.
