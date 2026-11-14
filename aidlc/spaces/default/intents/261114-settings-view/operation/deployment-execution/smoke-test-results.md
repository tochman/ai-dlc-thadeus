# Smoke Test Results — US-0405 Inställningar som vy

**Status: inte utfört.** Rökprovet kräver en installerad release, och ingen tagg har satts. Checklistan nedan är den som ska köras vid taggen; den står ordagrant i `operation/deployment-pipeline/deployment-strategy.md` (steg 7).

## Varför det inte kördes

Deployment Execution fick inget driftfönster: personen svarade "senare, jag säger till" på frågan om när v0.2.3 ska taggas. Utan tagg blir det ingen `.dmg` och ingen `.deb` att installera, och appens inbyggda dialoger, riktiga `--version`-svar och "sparad sökväg används vid nästa start" går inte att pröva i en testkörare (jsdom eller Vitest) — de kräver ett riktigt Electron-fönster.

## Vad som i stället bevisades

| Kontroll | Bevis |
|----------|-------|
| Appen bygger | `npx electron-vite build` exit 0, `out/main`, `out/preload`, `out/renderer` |
| Vyns logik och tillgängliga namn | `tests/renderer/SettingsView.test.jsx` (8 fall), jsdom |
| Vyns plats i skalet, arm, meny, paneler | `tests/renderer/AppShell.test.jsx`, jsdom |
| Verktygsuppslagning och validering | `tests/main/tools.test.js` (3 fall), Node |
| Sparad sökväg används vid start | `tests/main/pty.test.js`, Node (fejkad pty) |
| Nya inställningsnycklar | `tests/main/settings.test.js`, Node |

## Checklista att köra vid taggen

| # | Punkt | Status |
|---|-------|--------|
| 1 | Appen startar och visar arbetsytan | ☐ |
| 2 | Inställningar öppnas från armen och från `Cmd/Ctrl+,`; rubriken byter, armen markerar | ☐ |
| 3 | Verktyg: tre rader med sökväg och version; `Välj…` öppnar OS-dialogen; olaglig fil avvisas med skäl; `Återställ` försvinner när ingen egen sökväg finns | ☐ |
| 4 | Sparad `claude`-sökväg används vid **nästa** start av agentfliken | ☐ |
| 5 | Utseende: Animationer byter direkt; Språk växlar hela appen utan omstart; Frågor och Ljud sparas | ☐ |
| 6 | Projekt: standardmappen används av `Öppna projekt…`; senaste post kan tas bort; knappen öppnar Projektinställningar | ☐ |
| 7 | Om: appversion, AI-DLC-version (eller orsaken), repo- och feature-länkar | ☐ |
| 8 | Esc stänger vyn, du är tillbaka i vyn du kom ifrån, **terminalfliken finns kvar med sin scrollback** | ☐ |
| 9 | Vyn håller ihop i fullskärm 1100–2560 px; texten klipps inte (NFR3) | ☐ |

Punkt 3–5 är där **US-0401** ("verifierad på installerad release på macOS och Linux") stängs; punkt 9 hör till NFR3. Båda står kvar som öppna i `docs/releases/0.2.3.md`.

## Utfall

| Plattform | Paket | Rökprov |
|-----------|-------|---------|
| macOS | `THADEUS-0.2.3-universal.dmg` | ej kört (ingen artefakt) |
| Linux | `thadeus_0.2.3_amd64.deb` | ej kört (ingen artefakt) |
