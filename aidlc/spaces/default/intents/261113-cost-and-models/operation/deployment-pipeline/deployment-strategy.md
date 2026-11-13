# Releasestrategi — EPIC-02

Underlag: användarens beslut (meddelande 21d0ce27) och `deployment-pipeline-questions.md`.

- **Ingen egen tagg:** EPIC-02 mergas till `main` via en PR men taggas inte separat.
- **Samlad release:** releasen görs som **v0.2.0** när EPIC-03, EPIC-04 US-0402 och EPIC-05 också är klara. Den innehåller en universell dmg för Mac och en deb för Linux.
- **Verifiering före merge:** PR-körningen bygger båda paketen och kontrollerar glibc. Därmed är det visat före merge att EPIC-02 går att bygga för båda plattformarna.
