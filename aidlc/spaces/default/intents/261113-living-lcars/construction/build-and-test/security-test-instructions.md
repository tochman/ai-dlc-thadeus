# Säkerhetstester — EPIC-04 US-0402 och US-0403

Underlag: `construction/code-generation/code-summary.md`.

- **Inga nya ytor:** inga nya IPC-kanaler och inga nya externa resurser. CSP är oförändrad, och Antonio laddas lokalt.
- **Inställningen `animations`** valideras i `sanitize()`. Ogiltiga värden utelämnas.
- **Inga filer i projektet:** den enda nya skrivningen är appens egen `settings.json`.
- **Tillgänglighet (NFR1):** dekoren är `aria-hidden`, och navigeringen har `aria-current` och fokusram.
