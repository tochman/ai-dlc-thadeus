# Återställning — EPIC-04 US-0402 och US-0403

Underlag: `deployment-strategy.md`.

- **Före taggen v0.2.0:** reverta merge-committen för designlyftet på `main` (`git revert -m 1 <sha>`) och öppna en PR.
- **Efter releasen:** installera den föregående releasen. En äldre version ignorerar inställningen `animations` i `settings.json`.
