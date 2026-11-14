# Releaselogg: v0.2.3

| Steg | Status | Detaljer |
|------|--------|----------|
| Småfixar före tagg [Q1] | ✅ | US-0004 byggdes (popupens svar skickas som pickerns egen tangent, och bara till en picker som visar frågan). US-0005 byggdes (Fortsätt väntar medan arbetet pågår). Hela EPIC-00 är ✅ Klar. |
| Feature-dokument | ✅ | Storymarkörer, epicernas `**Status (…)**`-rader och `docs/FEATURES.md` är uppdaterade. Uppfyllda kriterier är bockade. Två kriterier är öppna med en notering: US-0401 Linux och US-0407 "Install and restart" på en riktig maskin. |
| Releaseplan | ✅ | `docs/releases/0.2.3.md` har avsnittet "What shipped in v0.2.3". US-0803 är flyttad från stretch in i releasen (FR3.5). |
| Version | ✅ | `package.json` = `0.2.3` (FR3.3). |
| Releasebranch [Q2] | ✅ | `release/v0.2.3`, commit `1841102`, pushad till `origin`. |
| PR | ✅ | https://github.com/tochman/aidlc-dash/pull/21 mot `main` (FR3.4). |
| PR-körning av `release.yml` | ⏳ | Startad av PR:en. Den ska vara grön innan merge. |
| Merge | ⏳ | Du gör den. |
| Tagg `v0.2.3` | ⏳ | Efter merge: `git switch main && git pull && git tag v0.2.3 && git push origin v0.2.3`. |
| Publicering | ⏳ | Workflowet skapar en vanlig release med `.dmg`, `.deb` och `SHA256SUMS.txt` [Deployment Pipeline Q3]. |
| "Released in v0.2.3" | ⏳ | Varje story märks när taggen är satt (FR3.2). |

Inte committat: mappen `inception/` i repots rot. Den är ett tidigt utkast av kravdokumentet som hamnade utanför intentens mapp, och den ingår inte i releasen.
