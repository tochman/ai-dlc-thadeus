# Säkerhetstester — EPIC-03

Underlag: `construction/code-generation/code-summary.md`.

- **Inga nya ytor:** inga nya IPC-kanaler, inga skrivanrop och inga externa kommandon.
- **Nytt beroende:** `@tanstack/react-virtual` `3.14.24`. Versionen är fastlåst och publicerades 2026-10-29. Paketet är ren JavaScript och körs bara i renderaren, som är sandlådad.
- **Rendering av audit-data:** innehållet renderas fortfarande som text via React. Ingen `dangerouslySetInnerHTML` används.
