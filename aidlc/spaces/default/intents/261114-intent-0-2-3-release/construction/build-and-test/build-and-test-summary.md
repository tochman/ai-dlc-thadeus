# Build and Test Summary: v0.2.3

## Status

- **Build:** success (`npx electron-vite build`).
- **This work's tests:** 81 of 81 pass.
- **Full suite:** 278 of 278 pass. The macOS installer `dist/THADEUS-0.2.3-universal.dmg` is built.
- **Test types:** unit tests only (Minimal strategy), plus one timing measurement in the real Electron renderer. No extra instruction files are generated at Minimal.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|-----------|--------|----------|--------|----------|--------------|---------|
| T-SUITE | requirements.md NFR1; Testing Contract scope floor | Existing suite green | 278/278 | test-results.md, Full suite | build-and-test | Met |
| FR1.6 | requirements.md; epic-04 US-0408 | "Om T.H.A.D.E.U.S." window with version | Built; 5 renderer tests and 1 menu test pass | `tests/renderer/AboutDialog.test.jsx`, `tests/main/menu.test.js` | build-and-test | Met |
| NFR1 | requirements.md | No regression against the baseline | Same single failure before (223/224) and after (266/267) | code-summary.md; test-results.md | build-and-test | Met |
| NFR2 | requirements.md | ≥1 test per story requirement FR1.2–FR1.5 | 43 new tests across 4 new and 5 extended files | test-results.md | build-and-test | Met |
| NFR3 | requirements.md | Another repo's asset URL is refused | `assertOwnAsset` test passes | `tests/main/updater.test.js` | build-and-test | Met |
| NFR4 | requirements.md | No shell or string-built commands | No `shell: true`/`execSync`/template exec in the new modules; allow-list tests pass | grep over `aidlcWrite.js`, `modelChoice.js`, `updater.js`, `ipc.js`; `tests/main/aidlcWrite.test.js` | build-and-test | Met |
| NFR5 | requirements.md | Offline: the app starts and says so in one sentence | Unit only: a `gh` failure gives `unavailable`; a real offline start was not run | `tests/main/updater.test.js` | build-and-test | Unverified |
| FR2.1 | requirements.md; epic-03 US-0301 | < 200 ms after a filter change with 20 000 events, windowed | 25–34 ms; 20 rows rendered | test-results.md (real Electron renderer) | build-and-test | Met |
| FR2.2 | requirements.md; epic-01 US-0401 | Verified on an installed release on macOS and Linux | macOS: the person installed the 0.2.3 DMG; it starts, shows 0.2.3 in "Om T.H.A.D.E.U.S." and opens a project. Linux: not run | test-results.md, Checks on the person's machines | build-and-test | Partly met (macOS) |
| T-UPDATE | requirements.md FR1.4; epic-04 US-0407 | A real update installs and relaunches on macOS and Linux | Not run; fakes only | none | build-and-test | Unverified |
| T-COV | Testing Contract | Coverage floor | No floor set for this scope | none | n/a | N/A |
| T-CI | Testing Contract | CI before merge | The plan runs no CI Pipeline | none | n/a | N/A |

## Readiness

- **Build-ready:** yes.
- **Test-ready:** yes for macOS. The full suite is green and the installed 0.2.3 build was checked on macOS. Still open: the Linux install (FR2.2), a real update (T-UPDATE) and a real offline start (NFR5).
- **Deployment-ready:** yes for the macOS release; the Linux check follows on the `.deb` built by CI.

## Known limitations

- US-0407's install path (copying over the running bundle, the admin prompt, `pkexec`) has never run on a real machine.
- US-0904's opencode rows rely on `opencode models` output captured on this machine.
