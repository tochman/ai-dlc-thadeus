# Scope Definition: frågor för US-1201 (koncept för teamsamarbete)

Underlag: `ideation/intent-capture/intent-statement.md`. Intent Capture godkändes med fyra öppna granskningsfynd: inget framgångsmått, ingen prioritering mellan problem och profiler, ingen hållning till ändringar i AI-DLC, och att användarprofilerna inte är validerade. Frågorna nedan stänger de tre första.

## Q1. [Produktägare] Vilken profil styr första versionen (v0.3.0)?

Intent statement nämner alla fyra profilerna. Storyerna behöver en profil att börja med.

A. Du på flera datorer: samma person, flera maskiner (enklast att prova direkt)
B. Ett litet team på 2–5 utvecklare i samma repo
C. Utomstående som bidrar till ett publikt repo
D. Ett större team eller flera team
E. Inte definierat ännu
X. Other (please specify)

[Answer]: A (2026-11-16, **Mode:** guided)

## Q2. [Produktägare] Vilket problem byggs först?

A. Vem gör vad: se vem som jobbar på vilken intent och story just nu
B. Undvika krockar: samma story, eller grenar som krockar (US-1202 finns redan som story för det)
C. Godkännanden, granskningar och öppna frågor når de andra
D. Komma igång som ny i projektet
E. Inte definierat ännu
X. Other (please specify)

[Answer]: B (2026-11-16, **Mode:** guided)

## Q3. [Produktägare] Hur vet vi att konceptet lyckats?

A. Konceptet klarar ett verkligt scenario: dagens krock mellan US-0209 och US-0414 hade synts i appen innan mergen
B. Första storyn går att bygga och leverera ensam, i v0.3.0
C. Både A och B
D. Inte definierat ännu (förs in som öppen fråga)
X. Other (please specify)

[Answer]: C (2026-11-16, **Mode:** guided)

## Q4. [Produktägare] Får konceptet föreslå ändringar i AI-DLC självt?

Konceptet kommer att använda `team.md`, audit-shards och team-board i Construction. Där något saknas kan appen bygga det själv eller föreslå det till AI-DLC.

A. Ja: det som saknas blir förslag (issue) till AI-DLC, och appen bygger bara på det som redan finns
B. Nej: allt löses i appen
C. Inte bestämt ännu
X. Other (please specify)

[Answer]: B (2026-11-16, **Mode:** guided)

## Q5. [Leveransansvarig] I vilken ordning läggs storyerna?

A. Värde först: det du har mest nytta av själv i morgon
B. Risk först: det som är mest osäkert (t.ex. att läsa andras arbete från git) prövas först
C. Beroenden först: grunden som de andra bygger på
D. Inte definierat ännu
X. Other (please specify)

[Answer]: B (2026-11-16, **Mode:** guided)

## Q6. [Leveransansvarig] Finns det en hård tidsgräns?

A. Nej: v0.3.0 släpps när de storyer som behövs är klara
B. Ja, ett datum (ange vilket)
C. Inte definierat ännu
X. Other (please specify)

[Answer]: A (2026-11-16, **Mode:** guided)

## Consolidated Summary Confirmation

- Första versionen (v0.3.0) styrs av profilen "du på flera datorer"; de andra profilerna kommer senare (Q1).
- Det första problemet att lösa är att undvika krockar: samma story, eller grenar som krockar (Q2).
- Konceptet har lyckats när dagens krock mellan US-0209 och US-0414 hade synts i appen innan mergen, och när den första storyn går att bygga och leverera ensam i v0.3.0 (Q3).
- Konceptet föreslår inga ändringar i AI-DLC; allt löses i appen, med det AI-DLC redan har (Q4).
- Storyerna läggs med risk först, så att det mest osäkra prövas först (Q5).
- Det finns ingen hård tidsgräns; v0.3.0 släpps när de storyer som behövs är klara (Q6).
- Konceptet visar kommentarer per story: både pull request-kommentarer och granskningar, och AI-DLC:s egna granskningsfynd, öppna frågor och godkännanden (Q7).
- GitHub, GitLab och Bitbucket stöds alla tre redan i v0.3.0, bakom ett gemensamt gränssnitt (Q8).
- Allt gränssnitt följer LCARS-stilen (ditt krav i ändringsönskemålet).

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Requested Changes Feedback

[Answer]: titta på koentar o andra plattformar. Senare i samma tråd: "Det är viktigt att vi följer LCARS gränssnittet i all interface. men vi kanske även bör tilla på GitLb och BitBucket - det är ju git så det borde vara relativt lätt"

## Q7. [Produktägare] Vilka kommentarer ska konceptet titta på?

A. Kommentarer och granskningar på pull requests (de som skrivs i GitHub, GitLab eller Bitbucket)
B. AI-DLC:s egna: granskningsfynd, öppna frågor och godkännanden i audit-loggen
C. Både A och B, visade tillsammans per story
D. Kommentarer på artefakterna i appen (en ny möjlighet att kommentera)
X. Other (please specify)

[Answer]: C (2026-11-16, **Mode:** guided)

## Q8. [Produktägare] När ska GitLab och Bitbucket med?

Det som bara är git (grenar, commits, vem som ändrat vad) fungerar likadant överallt. Pull requests, granskningar och kommentarer har däremot ett eget API och en egen inloggning per plattform.

A. Redan i v0.3.0: konceptet utgår från git och läser pull requests från GitHub, GitLab och Bitbucket bakom ett gemensamt gränssnitt
B. Konceptet utgår från ren git (fungerar för alla) i v0.3.0. Pull requests och kommentarer stöds först för GitHub, och GitLab och Bitbucket blir egna storys senare
C. Bara GitHub nu; de andra tas upp i ett senare koncept
X. Other (please specify)

[Answer]: A (2026-11-16, **Mode:** guided)
