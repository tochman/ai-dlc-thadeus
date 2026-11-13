# Releasestrategi — EPIC-04 US-0406

Underlag: `deployment-pipeline-questions.md`.

1. En PR mot `main`, som användaren mergar.
2. Deb-paketet från CI-körningen kontrolleras: `Package: thadeus`, `Replaces/Conflicts: aidlc-dash` och `.desktop` `Name=T.H.A.D.E.U.S.`.
3. Ingen tagg. Nästa release, med US-0505 och US-0406, taggas när användaren bestämmer det. Då höjs versionen, och storyerna märks "Released in vX.Y.Z" enligt projektregeln.
