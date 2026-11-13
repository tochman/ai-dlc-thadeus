# Deployment Execution — frågor (v0.1.1)

Kontroller före release:
- PR #4 har grön CI: verify, build-mac och build-linux på ubuntu-22.04, med OK från glibc-kontrollen.
- `package.json` har version `0.1.1`.
- Inga migreringar och inga beroende tjänster.

Releasen kräver att PR #3 (https://github.com/tochman/aidlc-dash/pull/3) och PR #4 (https://github.com/tochman/aidlc-dash/pull/4) är mergade till `main`. Användaren mergar själv, enligt beslutet i EPIC-01.

## Q1. [Release] Är PR #3 och PR #4 mergade till `main`?

När de är mergade taggar jag `v0.1.1` på `main` och följer release-workflowen.

A. Ja, båda är mergade
B. Inte än
X. Other (please specify)

[Answer]: A
