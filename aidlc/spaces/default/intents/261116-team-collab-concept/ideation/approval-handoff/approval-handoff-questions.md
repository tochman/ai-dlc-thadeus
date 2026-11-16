# Approval & Handoff: frågor för US-1201 (koncept för teamsamarbete)

Underlag:
- `ideation/intent-capture/intent-statement.md` och `stakeholder-map.md`
- `ideation/scope-definition/scope-document.md` och `intent-backlog.md`

Market Research, Feasibility, Team Formation och Rough Mockups är borttagna ur planen. Frågor om marknadsunderlag, budget, mobbar och skisser gäller därför inte.

## Q1. [Leveransansvarig] Är riskerna erkända?

De öppna riskerna är:
- Det är oprövat om GitHub, GitLab och Bitbucket alla har API:er för pull requests, granskningar och kommentarer som kan läsas med din egen inloggning. Backloggens post 1 prövar det först.
- Användarprofilerna är inte prövade mot verkliga användare. Det godkändes som risk vid Intent Capture.
- Det finns inget mått bortom de två i Scope Definition.

A. Ja, riskerna är erkända som de står
B. Ja, men plattformsrisken ska prövas med en liten spik innan storyerna skrivs
C. Nej, en risk saknas (ange vilken)
X. Other (please specify)

[Answer]: A (2026-11-16, **Mode:** guided)

## Q2. [Produktägare] Vad ska de sista stegen, Code Generation och Build and Test, ta fram?

US-1201 ska inte innehålla kod. Planen har ändå kvar Code Generation och Build and Test efter Functional Design, som vi hoppar förbi.

A. Granskningen, konceptet och de nya storyerna skrivs in i `docs/features/epic-12-team-collaboration.md` som "kod". Build and Test kontrollerar dokumentens tester (feature-docs-testet och i18n) och att sviten är grön
B. Konceptet skrivs nu, och Code Generation bygger dessutom en första liten spik för plattformskopplingen (post 1)
C. Ta bort Code Generation och Build and Test. Konceptet och storyerna skrivs som en del av den här handoffen, och arbetsflödet avslutas
X. Other (please specify)

[Answer]: X. Other: vi ändrar storyn. vi ska utveckla kod och impleentera föreslagna lösningar (2026-11-16, **Mode:** guided)

## Q3. [Produktägare] Går vi vidare?

A. Ja (go): skriv konceptet utifrån omfattningen och backloggen
B. Nej (no-go): stoppa här
X. Other (please specify)

[Answer]: A (2026-11-16, **Mode:** guided)

## Q4. [Produktägare] Vilka delar av backloggen ska byggas i den här storyn?

Du ändrade storyn så att vi utvecklar kod och implementerar lösningarna (Q2). Backloggen har fem poster, och post 2 finns redan som en egen story, US-1202.

A. Bara de tre Must-posterna: plattformskoppling för alla tre plattformarna, krockvarning (US-1202 slås ihop med den här storyn), och vem gör vad över mina datorer
B. Krockvarning med ren git och vem gör vad över mina datorer. Plattformskopplingen och kommentarerna blir egna storys efteråt
C. Alla fem posterna i den här storyn
D. Bara post 1, plattformskopplingen för alla tre plattformarna, som grund. Resten blir egna storys
X. Other (please specify)

[Answer]: C (2026-11-16, **Mode:** guided)

## Consolidated Summary Confirmation

- Riskerna är erkända som de står: plattformarnas API:er och inloggning är oprövade, och användarprofilerna är inte validerade (Q1).
- Storyn ändras: US-1201 ska inte längre bara vara ett koncept utan utveckla kod och implementera de föreslagna lösningarna. Det ersätter "ingen kod" i den ursprungliga beskrivningen (Q2).
- Beslutet är go (Q3).
- Alla fem posterna i backloggen byggs i den här storyn: plattformskopplingen för GitHub, GitLab och Bitbucket, krockvarningen (US-1202 slås ihop med US-1201), vem gör vad över mina datorer, kommentarer per story, och ändringarna från granskningen av GitHub-panelen (Q4).
- Granskningen av GitHub-panelen görs först i Code Generation, eftersom den styr post 5 (följer av Q4).

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
