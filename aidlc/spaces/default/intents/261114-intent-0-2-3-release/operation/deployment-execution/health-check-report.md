# Hälsokontroll: v0.2.3

Appen är en skrivbordsapp utan backend. Den har därför inga drifttjänster, inga SLO:er och ingen databas att kontrollera. Hälsan för den här releasen är releasens egna filer och appens första start.

| Kontroll | Hur | Status |
|----------|-----|--------|
| Releasen är komplett | tre filer på releasen; `SHA256SUMS.txt` stämmer (`sha256sum -c`) | ⏳ efter taggen |
| Uppdateraren ser releasen | en v0.2.2 har ingen uppdaterare, så den första kontrollen sker från v0.2.3 till nästa release | ⏳ nästa release |
| Start utan nätverk (NFR5) | enhetstestat (`gh` misslyckas, och appen säger det i en mening); ingen riktig start utan nätverk är gjord | delvis |
| Rollback finns | `gh release edit v0.2.3 --prerelease` gör v0.2.2 till latest igen | redo |

Inga databasmigreringar och inga beroende tjänster.
