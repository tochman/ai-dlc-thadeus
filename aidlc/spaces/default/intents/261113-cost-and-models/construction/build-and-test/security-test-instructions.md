# Säkerhetstester — EPIC-02

Underlag: `construction/code-generation/code-summary.md`.

- `aidlc config models` körs med `execFile` utan skal, fasta argument och 10 s timeout. Ingen användarinmatning når kommandot.
- Ledgern läses read-only via projektets rot. Appen skriver inga AI-DLC-filer.
- Renderaren får bara den sammanfattade kostnaden, inte hela ledgern. Preload exponerar bara de namngivna funktionerna `getCost` och `getModels`.
