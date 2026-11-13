# Frågor om kraven — EPIC-04 US-0406 Namnet T.H.A.D.E.U.S.

Underlag:
- `docs/features/epic-04-branding-and-desktop.md` (US-0406)
- `inception/reverse-engineering/developer-scan.md`

Storyn bestämmer redan:
- visningsnamnet "T.H.A.D.E.U.S."
- kortformerna THADEUS och thadeus
- det utskrivna namnet och taglinen på startskärmen och i About-panelen
- att Auctum-symbolen står kvar
- att inställningarna bevaras (userData förblir `aidlc-dash`)

Tre saker är öppna.

## Fråga 1
Hur ska namnet och Auctum stå tillsammans i sidhuvudets armbåge? Där finns plats för cirka 84 px text bredvid symbolen.

A. "T.H.A.D.E.U.S." på första raden och "by Auctum" på andra raden, där "Aidlc control" står i dag.
B. Bara "T.H.A.D.E.U.S." på en rad. Auctum-symbolen bredvid räcker som avsändare.
C. "T.H.A.D.E.U.S." på första raden och "Human-AI dev env" som kort underrad. "by Auctum" står bara på startskärmen och i About-panelen.
X. Other (please specify)

[Answer]: B.

## Fråga 2
Vad händer med appen på macOS? (Det som avgörs är appId, i dag `se.auctum.aidlc-control`.)

A. Behåll appId. macOS ser den nya versionen som samma app, så Dock-fästet och behörigheten för notiser finns kvar. Appfilen får det nya namnet "THADEUS.app", och README säger att den gamla "Auctum AIDLC Control.app" ska tas bort.
B. Nytt appId, `se.auctum.thadeus`. Rent namn rakt igenom, men macOS ser en ny app: Dock-fästet och behörigheten för notiser måste göras om.
X. Other (please specify)

[Answer]: B.

## Fråga 3
Vad händer med deb-paketet på Linux? (I dag heter paketet `aidlc-dash`.)

A. Behåll paketnamnet `aidlc-dash`, så att `apt install` av en ny version uppgraderar den gamla. Programmet, startposten och filen får ändå det nya namnet: `thadeus_<version>_amd64.deb`, startposten "T.H.A.D.E.U.S." och kommandot `thadeus`.
B. Byt paketnamnet till `thadeus` och markera att det ersätter `aidlc-dash`, så att det gamla tas bort vid installationen.
X. Other (please specify)

[Answer]: B.
