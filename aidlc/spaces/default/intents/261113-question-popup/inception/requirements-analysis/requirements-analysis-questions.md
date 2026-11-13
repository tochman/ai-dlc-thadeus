# Frågor om kraven — EPIC-05 US-0505 Claudes frågor som popup

Underlag:
- `docs/features/epic-05-workflow-control.md` (US-0505)
- `inception/reverse-engineering/developer-scan.md`

Storyn bestämmer redan vad som räknas som en väntande fråga, att popupen inte är modal, att en notis visas när fönstret ligger i bakgrunden, att knappen "Svara i Claude" finns, och inställningen Popup och notis / Bara popup / Av. Tre saker är öppna.

## Fråga 1
Var ska popupen visas?

A. Nere till höger i innehållsramen, ovanför konsolen. Flera frågor staplas på varandra, och popupen täcker inte terminalen.
B. Som ett band överst i innehållsramen, under rubriken. Det trycker ner innehållet i stället för att ligga ovanpå.
C. I den nedre armen bredvid Claude-fliken, nära där svaret skrivs.
X. Other (please specify)

[Answer]: X. I mitten, över allt annat, som inställningsdialogen ("in center over everything else (like the settings popup)").

## Fråga 2
Ska vänsterarmen visa vilka projekt som har en väntande fråga?

A. Ja. Projektblocket får korallflik och puls ("väntar på dig") och antalet väntande frågor, så att det syns också när popupen är stängd.
B. Nej, popupen och notisen räcker.
X. Other (please specify)

[Answer]: B.

## Fråga 3
Ska systemnotisen låta?

A. Ja, med systemets standardljud.
B. Nej, tyst notis.
C. Ett eget val i inställningarna (Ljud på/av). Standard är på.
X. Other (please specify)

[Answer]: C. Dessutom: "en texten headern och rubriken ska övergå till glödande röd efter 20 sekunders inaktivitet - om operatören missar att besvara frågan i tid".
