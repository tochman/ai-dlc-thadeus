# Återställning — EPIC-03

Underlag: `deployment-strategy.md`.

- **Före taggen v0.2.0:** reverta merge-committen för EPIC-03 på `main` med `git revert -m 1 <sha>` och öppna en PR. Revert-committen tar också bort beroendet ur `package.json` och lockfilen.
- **Efter releasen:** installera den föregående releasen från GitHub Releases. Ingen data migreras.
