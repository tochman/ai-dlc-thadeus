# Scope Document: US-1201, koncept för teamsamarbete

Bygger på `ideation/intent-capture/intent-statement.md`. Svaren finns i `scope-definition-questions.md` (Q1–Q8).

## Mål för första versionen (v0.3.0)

- **Profil:** du på flera datorer. Samma person arbetar i samma projekt från flera maskiner (Q1).
- **Första problemet:** att undvika krockar, både när två arbetar på samma story och när grenar krockar (Q2).
- **Framgång:** en krock som den mellan US-0209 och US-0414 den 2026-11-16 hade synts i appen innan mergen, och den första storyn går att bygga och leverera ensam i v0.3.0 (Q3).

## Inom omfattningen

- **Granskningen:** granska GitHub-panelen som den ser ut idag: vad den gör bra, vad som saknas eller förvirrar, och vad som ska ändras (US-1201).
- **Konceptet:** vilka delar av git och AI-DLC appen ska visa eller styra, och vilka den lämnar åt plattformen (US-1201).
- **Kommentarer per story:** kommentarer och granskningar på pull requests, tillsammans med AI-DLC:s egna granskningsfynd, öppna frågor och godkännanden (Q7).
- **Plattformar:** GitHub, GitLab och Bitbucket, alla tre i v0.3.0, bakom ett gemensamt gränssnitt (Q8).
- **Resultat:** nya storys i EPIC-12, var och en med acceptanskriterier och release, i v0.3.0 eller senare (US-1201).

## Utanför omfattningen

- **Profilerna** litet team, större team och utomstående bidragsgivare. Konceptet nämner dem, men de byggs inte i v0.3.0 (Q1).
- **Att komma igång som ny i projektet** byggs inte i v0.3.0 (Q2).
- **En egen server eller molntjänst.** Allt bygger på git, plattformarna och AI-DLC:s filer (intent statement, Q6).
- **Ändringar i AI-DLC självt.** Det som saknas löses i appen (Q4).

## Fasta gränser

- **Gränssnitt:** allt följer LCARS-stilen (ändringsönskemålet i `scope-definition-questions.md`).
- **AI-DLC-filer:** appen skriver inga av AI-DLC:s egna filer. Den läser dem, och ändrar konfiguration bara genom `aidlc`-kommandot (projektets befintliga regel).
- **Ordning:** storyerna läggs med risk först (Q5).
- **Tid:** ingen hård tidsgräns; v0.3.0 släpps när storyerna är klara (Q6).

## Assumptions & Open Questions

- [assumption] Alla tre plattformarna har ett API för pull requests, granskningar och kommentarer som går att läsa med användarens egen inloggning. Det prövas först, eftersom ordningen är risk först.
- [assumption] Användarprofilerna är inte validerade med verkliga användare. Det var ett fynd vid Intent Capture som godkändes som risk.
