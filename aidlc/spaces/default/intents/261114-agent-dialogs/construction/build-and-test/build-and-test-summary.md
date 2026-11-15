# Build and Test Summary: US-0506 agent dialogs

## Sources

- Testing Contracts in `construction/u1-questions/code-generation/code-generation-plan.md` … `construction/u5-notifications/code-generation/code-generation-plan.md` (tdd, standard strategy, classic scope, no CI line)
- `construction/<unit>/code-generation/unit-test-instructions.md` and `code-summary.md` for u1–u5
- `construction/<unit>/nfr-requirements/*-requirements.md` (every NFR row), `construction/<unit>/nfr-design/`
- Team rules: 80% line coverage, ESLint and Prettier, suite green before merge

## Status

| | |
|---|---|
| Build | ✅ `electron-vite build` exit 0 |
| Tests | ✅ 1255 / 1255 passed (Node and jsdom; no real browser or built app) |
| Coverage | ✅ 89.25% lines; every per-file threshold met |
| Lint / format | ✅ 0 errors / clean |
| Manual release checks | ⚠️ 15 targets `Unverified` (need the release Mac or Ubuntu and a person) |

Test types generated: unit, script (real `sh` / `dash`), integration (real channel, installer on temp folders, event-to-notification), renderer (jsdom). Instructions: `build-instructions.md`, `integration-test-instructions.md`. Standard strategy: no performance or security instruction files; their targets are covered by the tests or listed below.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| T-COV | team rule; u1 NFR8.2 | ≥ 80% lines, all measured source | 89.25% | `npm run coverage`, `test-results.md` | build-and-test | Met |
| T-COV-UNIT | u1 NFR8.2, u3 NFR8.7, u5 NFR8.51 | ≥ 80% on each Unit's touched code | per-file thresholds pass; App.jsx touched code 95.2% | `test-results.md` Coverage | build-and-test | Met |
| T-LINT | u1 NFR8.3, u5 NFR8.52 | ESLint and Prettier 0 errors | 0 / 0 | `npm run lint`, `npm run format:check` | build-and-test | Met |
| T-BUILD | build-instructions | build exits 0 | exit 0 | `npx electron-vite build` | build-and-test | Met |
| T-SUITE | Testing Contract scope floor | existing suite green | 1255 passed | `npm run coverage` | build-and-test | Met |
| T-CI | team rule "checked in CI" | run in CI before merge | n/a here | the plan runs no CI Pipeline (`ci-pipeline` skipped); the repo's `verify` job still runs it on the PR | ci-pipeline | N/A |
| u1-AUTO | u1 nfr-requirements rows (NFR1.4–1.7, 2.1, 2.3, 3.1–3.12, 4.1–4.3, 5.1–5.12, 6.1–6.3, 7.1–7.2, 8.1, 8.4) | as each row | named tests pass | full suite | build-and-test | Met |
| u2-AUTO | u2 nfr-requirements rows (NFR1.11–1.13, 2.4, 2.6, 2.7, 3.13–3.21, 4.4, 4.5, 5.13–5.24, 6.4–6.6, 7.3, 7.4, 8.5, 8.6) | as each row | named tests pass | full suite | build-and-test | Met |
| u3-AUTO | u3 nfr-requirements rows (NFR1.10–1.12, 2.4, 2.6, 3.13–3.23, 4.4–4.8, 5.13–5.24, 6.4–6.6, 7.3, 7.4, 8.5–8.7) | as each row | named tests pass | full suite | build-and-test | Met |
| u4-AUTO | u4 nfr-requirements rows (NFR1.14–1.17, 3.24–3.32, 4.9–4.11, 5.25–5.37, 6.7, 6.8, 7.5, 7.6, 8.8) | as each row | named tests pass | full suite | build-and-test | Met |
| u5-AUTO | u5 nfr-requirements rows (NFR1.51, 1.52, 1.54–1.56, 3.50–3.56, 5.50, 6.50–6.58, 7.50, 8.50–8.53) | as each row | named tests pass | full suite | build-and-test | Met |
| u1 NFR1.1 | u1 performance | question shown ≤ 1 s, 20 Claude Code runs + opencode runs | not run | release Mac, timing log | none scheduled | Unverified |
| u1 NFR1.2 | u1 performance | answer delivered ≤ 1 s, 20 runs | not run | release Mac, timing log | none scheduled | Unverified |
| u1 NFR1.3 | u1 performance | keys ≤ 1 s after click; picker time-out case on both harnesses | unit test passes; manual case not run | release Mac | none scheduled | Unverified |
| u1 NFR2.2 | u1 reliability | 10 of 10 scenario runs, both harnesses | not run | release Mac | none scheduled | Unverified |
| u2 NFR1.8 | u2 performance | permission shown ≤ 1 s, 20 runs | not run | release Mac | none scheduled | Unverified |
| u2 NFR1.9 | u2 performance | choice delivered ≤ 1 s, 20 runs | script take 300 ms passes; real runs not done | release Mac | none scheduled | Unverified |
| u2 NFR1.10 | u2 performance | opencode permission ≤ 1 s | not run | release Mac | none scheduled | Unverified |
| u2 NFR2.5 | u2 reliability | 6 of 6 choice runs behave as the terminal | not run | release Mac | none scheduled | Unverified |
| u3 NFR1.8 | u3 performance | reply shown ≤ 1 s, 20 runs | not run | release Mac | none scheduled | Unverified |
| u3 NFR1.9 | u3 performance | reply delivered ≤ 1 s, 20 runs | store test passes; real runs not done | release Mac | none scheduled | Unverified |
| u3 NFR2.5 | u3 reliability | 2 of 2 runs take "notes.md" | not run | release Mac | none scheduled | Unverified |
| u4 NFR8.9 | u4 (RD44) | install both harnesses, duplicate-hook check, Remove back to fallback | not run | release Mac | none scheduled | Unverified |
| u5 NFR1.50 | u5 performance | notification ≤ 1 s, 20 runs | stamp unit test passes; real runs not done | release Mac | none scheduled | Unverified |
| u5 NFR1.53 | u5 performance | dialog ≤ 1 s after notification click, 10 runs | renderer test passes; real runs not done | release Mac | none scheduled | Unverified |
| u5 NFR3.57 | u5 security | Linux notification shows markup as text | not run | Ubuntu 22.04 GNOME `.deb` | none scheduled | Unverified |

## Readiness

- Build-ready: yes. Test-ready: yes.
- Deployment-ready: **not yet**. The 15 manual targets belong before the release pull request (team gate: local `.dmg` check by hand), and no stage of this plan runs them.

## Known limitations

- Code Generation's trace files for u2–u5 do not list their NFR sub-IDs, so the cross-unit check reports them uncovered (`cross-unit-traceability.md`). The tests exist; the record is incomplete.
- u5 left out an `agentDialog.stillWaiting` key; red escalation applies to every kind (feature docs must say so).
- Lint has 22 warnings (no errors).
