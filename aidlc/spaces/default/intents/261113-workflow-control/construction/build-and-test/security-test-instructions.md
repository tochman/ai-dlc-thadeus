# Säkerhetstester — EPIC-05

Underlag: `construction/code-generation/code-summary.md`.

- **Appens egna kommandon:** alla körs med `execFile` utan skal, med fasta argument och timeout. Användarinmatning hamnar aldrig i dem.
- **Git-värden:** ref måste vara grenens upstream eller `origin/main`. Sökvägar måste ligga under `aidlc/` och får inte innehålla `..`. Värden som börjar med `-` eller innehåller radbrytning avvisas. I den riktiga appen avvisades `../package.json`.
- **Kommandon som ändrar något:** de skrivs i den synliga terminalen utan Enter. Undantaget är bytet av intent, och där kontrolleras intentnamnet först mot `^[A-Za-z0-9][A-Za-z0-9._-]*$`.
- **Plugins:** pluginnamn valideras mot den hämtade listan och mot `^[a-z0-9-]+$`.
- **Skrivskydd:** `projectAccess.js` är oförändrad. Appen skriver inga AI-DLC-filer.
- **`scripts/fix-pty-perms.cjs`:** skriptet ändrar bara rättigheter på `spawn-helper` under `node_modules/node-pty/prebuilds/` och kör inga externa kommandon.
