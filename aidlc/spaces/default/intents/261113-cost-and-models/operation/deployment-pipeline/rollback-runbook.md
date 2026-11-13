# Återställning — EPIC-02

Underlag: `deployment-strategy.md`.

- **Innan v0.2.0 är taggad:** reverta EPIC-02:s merge-commit på `main` (`git revert -m 1 <sha>`) och öppna en PR.
- **Efter releasen:** användarna installerar den föregående releasen (v0.1.1) från GitHub Releases. Ingen datamigrering behövs, eftersom appen bara skriver sin egen `settings.json`.
