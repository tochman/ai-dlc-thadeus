# Spårbarhet — slutlig täckningskontroll

Källa: `aidlc engine sensor-traceability --stage build-and-test` (2026-11-13). Arbetet har inga units, och allt byggs i code-generation. Underlag: `code-generation-plan.md`, `unit-test-instructions.md` och `code-summary.md`.

**Utslag:** Kontrollen godkänns inte formellt. Ett id saknar byggmål, NFR1. Det markerades `Deferred` i Code Generation, eftersom det bara kan verifieras genom ett riktigt Linux-bygge. I Build and Test är NFR1 verifierat och uppfyllt i CI på `ubuntu-22.04`, genom glibc-kontrollen och analysen av `.deb`. Ingen kod saknas.

| ID | Täckt | Ägare | Målfil |
|----|-------|-------|--------|
| FR1.1 | Ja | code-generation | .github/workflows/release.yml |
| FR1.2 | Ja | code-generation | scripts/check-glibc.mjs |
| FR1.3 | Ja | code-generation | electron-builder.yml |
| FR2.1 | Ja | code-generation | src/main/pty.js |
| FR2.2 | Ja | code-generation | tests/main/pty.test.js |
| FR2.3 | Ja | code-generation | src/main/pty.js |
| FR3.1 | Ja | code-generation | build/icon.svg |
| FR3.2 | Ja | code-generation | electron-builder.yml |
| FR3.3 | Ja | code-generation, kompletterat i build-and-test | src/main/index.js, build/icons/ |
| FR3.4 | Ja | code-generation | src/main/index.js |
| FR3.5 | Ja | code-generation | scripts/make-icon.cjs |
| NFR1 | **Nej** (Deferred i code-generation) | build-and-test | Verifierat: test-results.md § CI (körning 43394678127) |
| NFR2 | Ja | code-generation | tests/main/pty.test.js |

## Var kontrollerna kördes

- Enhetstester: Node och jsdom
- Paketkontroller: GitHub Actions på ubuntu-22.04 och lokalt på macOS
- Ingen kontroll har gjorts på en installerad Ubuntu 22.04-maskin. Den görs efter releasen.
