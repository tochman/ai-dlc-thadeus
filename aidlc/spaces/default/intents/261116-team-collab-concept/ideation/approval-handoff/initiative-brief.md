# Initiative Brief: US-1201, teamsamarbete

Bygger på:
- `ideation/intent-capture/intent-statement.md`
- `ideation/intent-capture/stakeholder-map.md`
- `ideation/scope-definition/scope-document.md`
- `ideation/scope-definition/intent-backlog.md`

## Intent och problem

Appen är byggd för en person på en dator. GitHub-panelen hämtar andras AI-DLC-arbete men visar inte vem som gör vad (intent statement). Den första versionen gäller dig på flera datorer, och det första problemet att lösa är krockar: samma story, eller grenar som krockar (scope document).

## Ändrad story

US-1201 utvecklar nu kod och implementerar lösningarna. Det ersätter den ursprungliga "ingen kod" (Q2). Alla fem posterna i backloggen byggs i den här storyn, och US-1202 slås ihop med den (Q4):

1. **Plattformskoppling:** pull requests, granskningar och kommentarer från GitHub, GitLab och Bitbucket, bakom ett gemensamt gränssnitt och med din egen inloggning.
2. **Krockvarning:** grenen ligger efter main, eller samma filer ändras i en annan öppen pull request (US-1202).
3. **Vem gör vad över mina datorer:** pågående intents och storys per dator.
4. **Kommentarer per story:** kommentarer på pull requests tillsammans med AI-DLC:s fynd, frågor och godkännanden.
5. **Ändringar i GitHub-panelen** efter granskningen.

## Marknad, genomförbarhet, skisser, team

Market Research, Feasibility, Rough Mockups och Team Formation är borttagna ur planen. Det finns alltså inget marknadsunderlag, ingen genomförbarhetsbedömning, inga skisser och ingen teamplan. Du bygger med AI-DLC:s agenter.

## Risker

- Det är oprövat om alla tre plattformarna har läsbara API:er för det här med din egen inloggning. Post 1 byggs först (risk först, scope document).
- Användarprofilerna är inte prövade mot verkliga användare (intent statement, granskningsfynd R-04).
- Storyn är stor: fem delar utan Requirements Analysis och designsteg. Code Generation planerar utifrån backloggen och US-1202:s acceptanskriterier.
- Riskerna ovan godkändes som de står (Q1).

## Gränser

- LCARS-stil i allt gränssnitt.
- Ingen egen server eller molntjänst.
- Inga ändringar i AI-DLC, och appen skriver inga av AI-DLC:s filer.
- Ingen hård tidsgräns; målrelease är v0.3.0 (scope document).

## Rekommendation

**Go** (Q3). Nästa steg är Functional Design, som vi hoppar förbi som planerat, och sedan Code Generation, som börjar med granskningen av GitHub-panelen och plattformskopplingen.
