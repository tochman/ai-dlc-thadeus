# Intent Capture: frågor för US-1201 (koncept för teamsamarbete)

## Sources

- [desc] Initial description: "US-1201 (EPIC-12): granska GitHub-panelen (src/renderer/RefreshPanel.jsx) och forma ett koncept för teamsamarbete byggt på git och AI-DLC. Ingen kod: resultatet är en granskning, ett koncept som personen godkänner, och nya storys med acceptanskriterier och release (v0.3.0 eller senare). Se docs/features/epic-12-team-collaboration.md US-1201."
- [scope] Workflow-selected scope: `feature`.

## Q1. [Produktägare] Vilket problem ska konceptet lösa först?

Idag är appen byggd för en person på en dator. GitHub-panelen hämtar andras AI-DLC-arbete men visar inte vem som gör vad.

A. Att se vem som jobbar på vilken intent och story just nu
B. Att två personer inte råkar arbeta på samma story, eller med grenar som krockar (som US-0209 och US-0414 gjorde i dag)
C. Att en kollegas godkännanden, granskningar och öppna frågor når de andra
D. Att en ny teammedlem kommer igång i projektet
E. Inte definierat ännu
X. Other (please specify)

[Answer]: X. Other: egentligen alla fyra (2026-11-16, **Mode:** guided)

## Q2. [Produktägare] Vem är teamet konceptet är till för?

A. Du själv på flera datorer (som i dag: macbookpro och thomas-comlabs)
B. Ett litet team, 2–5 utvecklare i samma repo
C. Ett större team eller flera team i samma organisation
D. Utomstående som bidrar till ett publikt repo (som efter US-1101)
E. Inte definierat ännu
X. Other (please specify)

[Answer]: X. Other: egentligen alla dessa profiler som du nämner - det är ett brett användningsområde (2026-11-16, **Mode:** guided)

## Q3. [Produktägare] Hur vet vi att konceptet lyckats?

A. Du godkänner konceptet och det finns färdiga storys med acceptanskriterier och release för v0.3.0
B. Som A, och dessutom ska konceptet ha provats mot ett verkligt scenario (t.ex. dagens krock mellan två grenar)
C. Som A, och storyerna ska vara ordnade så att den första går att bygga ensam
D. Inte definierat ännu
X. Other (please specify)

[Answer]: D (2026-11-16, **Mode:** guided)

## Q4. [Produktägare] Varför nu?

A. v0.2.8 avslutas med den här storyn, och v0.3.0 ska handla om team
B. Arbete på flera datorer pågår redan, och kostnad och krockar visar att appen behöver se mer än en dator
C. Repot är publikt sedan US-1101, så andra kan börja bidra
D. Inte definierat ännu
X. Other (please specify)

[Answer]: A (2026-11-16, **Mode:** guided)

## Q5. [Produktägare] Vem beslutar och vem påverkar?

A. Du beslutar ensam; inga andra intressenter just nu
B. Du beslutar, och planerade teammedlemmar ska tillfrågas innan storyerna byggs
C. Inte identifierat ännu
X. Other (please specify)

[Answer]: A (2026-11-16, **Mode:** guided)

## Q6. [Produktägare] Vad ska den här första versionen av konceptet inte göra?

Planen är redan vald. Frågan gäller bara vad konceptet lämnar utanför.

A. Ingen egen server eller molntjänst: allt bygger på git, GitHub och AI-DLC:s filer
B. Inga ändringar i AI-DLC själv: appen använder det som finns (team.md, audit-shards, team-board), och det som saknas blir förslag till AI-DLC
C. Både A och B
D. Inget uteslutet ännu
X. Other (please specify)

[Answer]: A (2026-11-16, **Mode:** guided)

## Consolidated Summary Confirmation

- Konceptet ska lösa alla fyra problemen: se vem som gör vad, undvika krockar mellan storys och grenar, låta godkännanden, granskningar och öppna frågor nå de andra, och få en ny teammedlem igång (Q1).
- Det är till för alla profilerna: du på flera datorer, ett litet team, ett större team och utomstående bidragsgivare. Användningsområdet är brett (Q2).
- Hur vi mäter att konceptet lyckats är inte bestämt ännu (Q3).
- Varför nu: v0.2.8 avslutas med den här storyn, och v0.3.0 ska handla om team (Q4).
- Du beslutar ensam; det finns inga andra intressenter just nu (Q5).
- Den första versionen bygger inte en egen server eller molntjänst. Allt bygger på git, GitHub och AI-DLC:s filer (Q6).

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
