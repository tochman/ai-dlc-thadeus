# Releasestrategi — EPIC-05

Underlag: användarens beslut (meddelande 21d0ce27) och `deployment-pipeline-questions.md`.

- **Merge utan tagg:** EPIC-05 mergas till `main` via en PR och taggas inte separat.
- **Samlad release:** EPIC-05 släpps i **v0.2.0** tillsammans med EPIC-02, EPIC-03 och EPIC-04 (US-0402 och US-0403), med en universell dmg och en deb.
- **Viktigt för v0.2.0:** rättelsen av `spawn-helper` (F-01) gör att terminalen fungerar i Mac-appen. Röktestet av releasen ska därför innehålla att claude-fliken startar på en installerad Mac.
