# Frågor om kraven — EPIC-04 US-0404 Helskärm och egen appmeny

Underlag:
- `docs/features/epic-04-branding-and-desktop.md` (US-0404)
- `inception/reverse-engineering/developer-scan.md`

Storyn bestämmer redan menyernas innehåll, kortkommandon, Linux-beteendet och att menyn och knapparna ska använda samma kod. Två saker är fortfarande öppna.

## Fråga 1
Var ska helskärmsknappen ligga i appen?

A. Längst till höger i den översta balken, som ett litet LCARS-block med symbol och etiketten "Helskärm". Där syns den alltid, också i helskärm.
B. I vänsterarmen, under "Inställningar".
C. Både i den översta balken och som ett val i appens inställningsdialog ("Helskärm vid start").
X. Other (please specify)

[Answer]: X. Längst till höger i den översta balken, som i A, men etiketten växlar: "Helskärm" när appen inte är i helskärm och "Lämna helskärm" när den är det.

## Fråga 2
Vart ska "AI-DLC-dokumentation" i Hjälp-menyn leda?

A. Till det öppna projektets `docs/README.md` i AI-DLC-installationen, om filen finns. Den öppnas i appens artefaktläsare. Annars öppnas AI-DLC:s webbsida i webbläsaren.
B. Alltid till AI-DLC:s webbsida eller repo i webbläsaren.
C. Ta bort posten nu och lägg den i US-0405 (vyn Om).
X. Other (please specify)

[Answer]: A.
