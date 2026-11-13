# Återställning — EPIC-04 US-0404

Underlag: `deployment-strategy.md`.

- **Före taggen:** reverta merge-committen (`git revert -m 1 <sha>`) och öppna en PR.
- **Efter releasen:** markera releasen som pre-release eller ta bort den och hänvisa till v0.1.1. En äldre version ignorerar nyckeln `fullscreen` i `settings.json`.
