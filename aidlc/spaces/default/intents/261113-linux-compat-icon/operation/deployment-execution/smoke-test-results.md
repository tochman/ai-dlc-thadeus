# Smoke-test — v0.1.1

Testat på de publicerade filerna, hämtade med `gh release download v0.1.1`. Testet kördes på macOS x86_64. Underlag: `operation/deployment-pipeline/rollback-runbook.md` och `construction/build-and-test/test-results.md`.

## Linux (`aidlc-dash_0.1.1_amd64.deb`)

| Kontroll | Resultat |
|----------|----------|
| Paketmetadata | `Version: 0.1.1`, `Architecture: amd64` |
| Högsta glibc per ELF-binär | `pty.node`: GLIBC_2.34. `auctum-aidlc-control`: GLIBC_2.25. `libvk_swiftshader.so`: GLIBC_2.17. Alla ligger på högst 2.35 (Ubuntu 22.04). I v0.1.0 krävde `pty.node` GLIBC_2.42. |
| node-pty-prebuilds för darwin och win32 | 0 |
| Ikoner (hicolor) | 16, 24, 32, 48, 64, 128, 256 och 512 px |
| **Installation och start på Ubuntu 22.04** | **Väntar på användaren.** Ingen Linux-maskin finns här. |

## macOS (`Auctum.AIDLC.Control-0.1.1-universal.dmg`)

| Kontroll | Resultat |
|----------|----------|
| Arkitekturer | `x86_64 arm64` |
| Ikon och version | `CFBundleIconFile` = `icon.icns`, `CFBundleShortVersionString` = `0.1.1` |
| Start från den monterade `.dmg`:en | Körs efter 7 s utan att krascha |
| Ikonen i Dock (visuellt) | Väntar på användaren |
