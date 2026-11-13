# Säkerhetstester — EPIC-04 US-0404

Underlag: `requirements.md` NFR1 och `construction/code-generation/code-summary.md`.

- **`menu:command`** går bara från main till renderaren. Okända kommandon ignoreras.
- **`menu:state`** godtar exakt tre booleaner (`parseMenuState`, enhetstestat). Allt annat ignoreras.
- **Externa länkar** öppnas med `shell.openExternal`, bara med `https:`, mot fasta adresser (`ISSUES_URL`, `AIDLC_DOCS_URL`).
- **Utvecklarverktyg och omladdning** saknas i den paketerade appen.
- **Inga projektfiler skrivs.** Appen skriver bara sin egen `settings.json` (`fullscreen` som boolean).
