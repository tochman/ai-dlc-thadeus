# Säkerhetstester — EPIC-06

Underlag: `construction/code-generation/code-summary.md`.

- **Läsning:** all läsning går via `projectAccess` (realpath inom roten). Länkar till epic-filer kontrolleras med `resolveInRoot`, och länkar som pekar utanför roten hoppas över.
- **Sökvägar:** sökvägen i inställningen valideras. Den ska vara relativ, sluta på `.md` och inte innehålla `..`. `../outside.md` avvisades i provkörningen.
- **Projektrot:** `projectSettings:set` slår upp roten i huvudprocessen, så renderaren skickar aldrig in en rot.
- **Skrivningar:** inga skrivanrop går till projektet. Den enda filen som skrivs är appens `settings.json`, och skrivningarna sker i tur och ordning via en kö.
- **Markdown:** renderas med `react-markdown` utan rå HTML, som i dag.
