# Röktest — EPIC-04 US-0406

Underlag: `construction/build-and-test/test-results.md` och CI-artefakten `linux`.

Deb-paketet `thadeus_0.2.0_amd64.deb` från CI lästes med en egen ar-tolk på macOS:

| Fält | Värde |
|------|-------|
| `Package` | `thadeus` |
| `Replaces` / `Conflicts` | `aidlc-dash` / `aidlc-dash` |
| `.desktop` `Name` | `T.H.A.D.E.U.S.` |
| `Exec` | `/opt/THADEUS/thadeus %U` |
| `StartupWMClass` | `THADEUS` |

Mac-paketet byggdes lokalt med `se.auctum.thadeus` och `THADEUS.app`. Appen visar det nya namnet överallt (se Build and Test).
