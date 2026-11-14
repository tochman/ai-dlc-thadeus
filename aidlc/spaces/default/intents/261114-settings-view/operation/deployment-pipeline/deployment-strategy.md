# Deployment Strategy — US-0405 Inställningar som vy

## Vad som distribueras

En skrivbordsapp, inte en tjänst. Det finns ingen miljötrappa (dev → staging → prod) och ingen trafik att flytta: distributionen är en GitHub Release med två installationspaket, en `.dmg` (macOS, universal) och en `.deb` (Linux x64), som användaren själv hämtar och installerar.

Därför är **recreate**-strategin den enda som gäller: nya versionen ersätter den gamla vid installation. Ingen blue/green, ingen canary, inga feature flags.

## Livscykel per release

| Steg | Vem/vad | Grind |
|------|---------|-------|
| 1. Klar story | AI-DLC-intent godkänd (Build and Test grönt) | människa, den här workflowens gate |
| 2. Releaseberedskap | epic-filer + `FEATURES.md` uppdaterade; `package.json` bumpad | projektmandatet (alltid) |
| 3. Tagg | `v0.2.3` pushas till `main` | människa |
| 4. Verifiering | `verify`: `npm ci`, `npx vitest run tests/`, tagg == `package.json` | automatisk |
| 5. Paketering | `build-mac` (dmg universal), `build-linux` (deb x64 + glibc-kontroll) | automatisk, båda måste bli gröna |
| 6. Publicering | `gh release create v0.2.3 … --generate-notes` | automatisk efter 5 |
| 7. Rökprov | installera paketet, öppna appen | människa — den enda manuella grinden |
| 8. Märkning | storyn får "Released in v0.2.3" | projektmandatet |

**Varje grind är ett stopp:** en trasig testkörning, en tagg som inte matchar `package.json`, ett saknat paket eller en glibc-kontroll som fallerar hindrar publiceringen. Ingen av dem får kringgås.

## Rökprov efter installation (steg 7)

Kort listan som Build and Test inte kunde köra och som därför hör hit:

1. Appen startar och visar arbetsytan.
2. **Inställningar** öppnas från vänsterarmen och från `Cmd/Ctrl+,`; rubriken byter till Inställningar och armen markerar posten.
3. **Verktyg** visar tre rader med sökväg och version; `Välj…` öppnar operativsystemets filväljare; en olaglig fil avvisas med ett skäl och sparas inte; `Återställ` försvinner när ingen egen sökväg finns.
4. En sparad `claude`-sökväg används vid **nästa** start av agentfliken (stäng och öppna fliken).
5. **Utseende**: Animationer byter läge direkt; **Språk** växlar hela appen utan omstart; **Frågor från Claude** och **Ljud vid notis** sparas.
6. **Projekt**: standardmappen används av `Öppna projekt…`; en post i senaste listan kan tas bort; knappen per öppet projekt öppnar Projektinställningar.
7. **Om** visar appversion och AI-DLC-version (eller orsaken till att den inte hittades) samt öppnar repo och feature-dokument.
8. Esc stänger vyn och du är tillbaka i vyn du kom ifrån — **och terminalfliken är kvar, med sin scrollback**.
9. Vyn håller ihop i fullskärm på en bred skärm (1100–2560 px) och texten klipps inte.

Punkt 3–5 är också där US-0401:s "verifierad på installerad release" stängs, och punkt 9 hör till NFR3.

## Två miljöer, en artefakt per plattform

- **macOS:** `.dmg`, universal (x64 + arm64), osignerad — första start kräver att användaren tillåter appen i Systeminställningar → Integritet och säkerhet.
- **Linux:** `.deb` byggd på Ubuntu 22.04 (glibc 2.35, GLIBCXX_3.4.30) så att den kör på 22.04 och senare; `fpm` ersätter det gamla paketnamnet `aidlc-dash`.

## Vad storyn ändrar i riskbilden

- `userData`-mappen heter fortfarande `aidlc-dash`, så en uppgradering behåller inställningar, öppna projekt och senaste lista. Nya nycklar (`toolPaths`, `defaultProjectFolder`) saknas i en gammal `settings.json` → `sanitize()` ger tomma värden och appen beter sig som i v0.2.2.
- Den gamla dialogen är borta; en användare som vant sig vid den hittar samma fem inställningar under **Utseende**, plus tre nya sektioner.
- Ingen ändring i vad appen får skriva: bara `settings.json` i userData, aldrig i ett öppnat projekt.
