# Återställning — EPIC-06

Underlag: `deployment-strategy.md`.

- **Före taggen v0.2.0:** reverta merge-committen för EPIC-06 på `main` (`git revert -m 1 <sha>`) och öppna en PR.
- **Efter release:** installera den föregående releasen. En äldre version tar bort den okända nyckeln `projectSettings` ur `settings.json` när den läser filen. Inget annat går förlorat.
