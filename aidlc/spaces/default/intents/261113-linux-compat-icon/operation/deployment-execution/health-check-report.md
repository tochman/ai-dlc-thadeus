# Hälsokontroll — v0.1.1

Underlag: `operation/deployment-pipeline/cd-config.md` och `operation/deployment-pipeline/deployment-strategy.md`.

| Kontroll | Förväntat | Faktiskt | Status |
|----------|-----------|----------|--------|
| Release-workflow `v0.1.1` | Alla jobb gröna | verify, build-mac, build-linux och release: success (körning 43395952196) | OK |
| glibc-kontrollen i CI | OK | "OK: inga binärer i dist/linux-unpacked kräver mer än glibc 2.35 / GLIBCXX_3.4.30." | OK |
| GitHub Release | `.dmg` och `.deb` | 2 filer på https://github.com/tochman/aidlc-dash/releases/tag/v0.1.1 | OK |
| Linux-kompatibilitet (NFR1) | Inga binärer kräver mer än glibc 2.35 | Högst GLIBC_2.34 | OK maskinellt. Start på 22.04 väntar på användaren. |
| macOS-appen startar | Processen lever | Ja (x86_64) | OK |
| Appikon | Auctum-ikonen i paketen | `icon.icns` och hicolor 16–512 i `.deb` | OK maskinellt. Visuell kontroll väntar på användaren. |

## Kvar för användaren

1. Kör `sudo apt install ./aidlc-dash_0.1.1_amd64.deb` på Ubuntu 22.04.
2. Starta appen från startmenyn (med ikonen) och från en terminal (`auctum-aidlc-control`).
3. Godkänn ikondesignen (US-0401).
