# Leveransstrategi — Auctum AIDLC Control

## Sammanhang

En skrivbordsapp för internt bruk på Auctum. Det finns ingen server, ingen databas och ingen trafik att styra. Strategier som blue/green, canary och rolling deploy är därför inte tillämpliga. "Driftsättning" betyder här att publicera en ny version som användarna installerar själva.

## Strategi: versionerade releaser och manuell installation

| Aspekt | Beslut |
|--------|--------|
| Kanal | GitHub Releases i det privata repot `tochman/aidlc-dash` (Q1) |
| Trigger | En git-tagg `vX.Y.Z` på `main` som matchar `package.json`-versionen (Q2) |
| Versionering | Semver. Taggen och `package.json` måste stämma, och verify-jobbet stoppar releasen annars. |
| macOS | En universal `.dmg` (x64 och arm64), osignerad (Q3) |
| Linux | `.deb` för x64 (Q3, Q4) |
| Installation | Användaren laddar ner från releasen. På macOS: högerklicka och välj Öppna första gången (Gatekeeper). På Linux: `sudo apt install ./auctum-aidlc-control_X.Y.Z_amd64.deb`. |
| Miljöer | En enda: releasen. Det behövs ingen staging, eftersom appen bara läser lokala filer. Före en tagg kan man testa med `npm run dev` eller `npm run build:mac`. |
| Godkännande | Att pusha taggen är godkännandet. Bara den som har skrivrättighet till repot kan släppa en version. |
| Feature flags | Inga. Appen har inga flaggor, och det finns inget behov av dem i det här skedet. |

## Kriterier för en lyckad release

1. Alla fyra jobben i workflowen är gröna.
2. Releasen innehåller `Auctum AIDLC Control-X.Y.Z-universal.dmg` och `aidlc-dash_X.Y.Z_amd64.deb`.
3. Smoke-test efter release: appen startar och startskärmen visas, ett AI-DLC-projekt kan öppnas, och shell-fliken startar i projektmappen. Se `rollback-runbook.md`.

## Ändrat omfång

- NFR5 sa tidigare bara macOS, och Linux låg under "Utanför omfånget" i `requirements.md`. På användarens begäran (Q3, 2026-11-13) är Linux (`.deb`, x64) nu ett mål.
- Windows är fortfarande utanför omfånget.
- Linux-bygget och appen på Linux verifieras första gången i CI. De har inte provats lokalt, eftersom node-pty inte kan korskompileras från macOS.

## Risker

| Risk | Hantering |
|------|-----------|
| node-pty bygger inte för arm64 i universal-bygget | build-mac failar och ingen release skapas. Åtgärd: bygg två separata `.dmg`-filer (Q3 B) i stället. |
| Linux-bygget saknar systempaket på runnern | build-linux failar och ingen release skapas. Åtgärd: installera det som saknas i workflowen. |
| Osignerad app blockeras av Gatekeeper | Dokumenterat i README och här (högerklicka och välj Öppna). Signering kräver ett Apple Developer-konto och ingår inte nu. |
