# Smoke test: v0.2.3

## Före publicering (klart)

| Kontroll | Resultat |
|----------|----------|
| `npx vitest run tests/` på `release/v0.2.3` | 52 filer, 285 av 285 passerar |
| `npx electron-vite build` | lyckas |
| Installerad DMG på macOS (Build and Test) | startar, visar 0.2.3 i "Om T.H.A.D.E.U.S." och öppnar ett projekt (du, 2026-11-14) |

US-0004 och US-0005 byggdes efter DMG-testet. De täcks av enhetstester men har inte körts i en installerad build.

## Efter publicering (din tur)

- [ ] `gh release view v0.2.3 --repo tochman/aidlc-dash` listar `THADEUS-0.2.3-universal.dmg`, `.deb` och `SHA256SUMS.txt`.
- [ ] macOS: `.dmg` från releasen startar och visar 0.2.3.
- [ ] Linux (FR2.2 / US-0401): `.deb` installeras. Appen startar, visar 0.2.3 och öppnar ett projekt.
- [ ] US-0004: ett svar i popupen når Claude Codes picker, och frågan stängs.
- [ ] US-0005: Fortsätt är avstängd medan agenten arbetar eller väntar på ditt svar.

Om något misslyckas, följ `operation/deployment-pipeline/rollback-runbook.md`.
