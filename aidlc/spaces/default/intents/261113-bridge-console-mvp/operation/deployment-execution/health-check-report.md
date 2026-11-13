# Hälsokontroll — v0.1.0

Appen är en lokal skrivbordsapp utan server, så det finns inga endpoints, inga felfrekvenser och ingen trafik att mäta. Hälsokontrollen gäller därför release-kanalen och de publicerade filerna.

| Kontroll | Förväntat | Faktiskt | Status |
|----------|-----------|----------|--------|
| Release-workflow `v0.1.0` | Alla jobb gröna | verify, build-mac, build-linux och release: success (körning 43387223452) | OK |
| GitHub Release finns | `v0.1.0` med `.dmg` och `.deb` | https://github.com/tochman/aidlc-dash/releases/tag/v0.1.0, 2 filer | OK |
| Taggen matchar `package.json` | `v0.1.0` = `0.1.0` | Kontrollerat av verify-jobbet | OK |
| Releasen är privat | Synlig bara för dem med åtkomst till repot | Repot `tochman/aidlc-dash` är `PRIVATE` | OK |
| Inga hemligheter i workflowen | Bara `github.token` | Bekräftat i `release.yml` | OK |
| macOS-appen startar | Processen lever efter start | Körs efter 8 s (x86_64) | OK |
| Linux-paketet är installerbart | `.deb` med rätt arkitektur och beroenden | Strukturen är verifierad. Installationen är inte provad. | Delvis |

## Kända begränsningar

- **Osignerad app:** Gatekeeper kräver att man högerklickar och väljer Öppna första gången. Det är ett medvetet val (Q4 i kravanalysen).
- **Onödiga filer i paketen:** `.deb`:en innehåller node-pty-binärer för Windows och macOS som inte används på Linux. Det gör paketet ca 99 MB. Det påverkar inte funktionen, och det går att trimma senare med ett `files`-filter.
- **Ingen förvald appikon:** electron-builder varnade "default Electron icon is used". Appen visar därför Electrons standardikon i Dock och programmeny. Startskärmen och sidhuvudet har Auctum-loggan.
- **Varning om framtida beteende:** electron-builder varnade att det i v27 kommer att publicera implicit på taggar. Det påverkar inte oss, eftersom `publish: null` är satt.
