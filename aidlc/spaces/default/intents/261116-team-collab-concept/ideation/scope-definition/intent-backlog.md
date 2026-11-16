# Intent Backlog: US-1201, koncept för teamsamarbete

Den här backloggen gäller v0.3.0. Prioriteringen följer MoSCoW, och ordningen är risk först (Q5). Varje post blir en eller flera storys i EPIC-12 när konceptet är godkänt. Omfattningen och gränserna finns i `scope-document.md`, som bygger på `ideation/intent-capture/intent-statement.md`.

| # | Post | MoSCoW | Varför i den här ordningen | Beror på |
|---|---|---|---|---|
| 1 | **Plattformskoppling:** läsa pull requests, granskningar och kommentarer från GitHub, GitLab och Bitbucket bakom ett gemensamt gränssnitt, med användarens egen inloggning (Q8) | Must | Störst risk: tre API:er och tre sätt att logga in | – |
| 2 | **Krockvarning:** grenen ligger efter main, eller samma filer ändras i en annan öppen pull request. Finns redan som US-1202 (Q2, Q3) | Must | Löser första problemet och är framgångsmåttet | 1 för pull requests; ren git fungerar utan |
| 3 | **Vem gör vad över mina datorer:** vilka intents och storys som pågår på varje dator, från audit-shards och grenar (Q1) | Must | Profilen för v0.3.0; behövs för att se att samma story pågår på två ställen | – |
| 4 | **Kommentarer per story:** kommentarer och granskningar på pull requests, tillsammans med AI-DLC:s granskningsfynd, öppna frågor och godkännanden (Q7) | Should | Bygger på 1 och 3 | 1, 3 |
| 5 | **Granskning av GitHub-panelen:** de ändringar granskningen leder till (US-1201) | Should | Storleken avgörs först i granskningen | – |
| – | Litet team, större team, utomstående; att komma igång som ny (Q1, Q2) | Won't (v0.3.0) | Senare versioner | – |

## Värdeflöde

Plattformarnas och gits data (pull requests, grenar, audit-shards) → appen läser dem i ett gemensamt gränssnitt (1) → krockar och pågående arbete syns per story (2, 3) → kommentarer och AI-DLC:s frågor samlas per story (4) → du ser före mergen vad som krockar.

## Assumptions & Open Questions

- [assumption] Den första storyn som går att bygga ensam (Q3) är 2 med ren git, eller 3. Vilken som blir den första avgörs när storyerna skrivs, efter granskningen.
