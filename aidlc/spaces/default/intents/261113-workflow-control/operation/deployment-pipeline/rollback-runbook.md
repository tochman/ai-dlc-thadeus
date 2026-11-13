# Återställning — EPIC-05

Underlag: `deployment-strategy.md`.

- **Före taggen v0.2.0:** reverta merge-committen för EPIC-05 på `main` (`git revert -m 1 <sha>`) och öppna en PR.
- **Efter releasen:** användaren installerar den föregående releasen från GitHub Releases. Appen skriver bara sin egen `settings.json`, så ingen datamigrering behövs.
- **Om bara terminalrättelsen ställer till det:** ta bort `&& node scripts/fix-pty-perms.cjs` från `postinstall` i en PR.
