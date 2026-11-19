# Cross-Unit Traceability: US-0034

**Verdict:** pass. All 7 acceptance criteria are covered, with none uncovered. This is zero-Unit work, so every criterion belongs to Code Generation.

| ID | Covered | Target |
|----|---------|--------|
| US-0034-AC1 absolute pkexec/dpkg | yes | `src/main/updater.js` |
| US-0034-AC2 real reason shown | yes | `src/main/updater.js` |
| US-0034-AC3 own password dialog, sudo -S, stdin only | yes | `src/main/exec.js`, `src/main/updater.js` |
| US-0034-AC4 wrong password and cancel | yes | `src/renderer/UpdateNotice.jsx` |
| US-0034-AC5 closed pkexec dialog not asked again | yes | `tests/main/updater.test.js` |
| US-0034-AC6 texts through `t()` | yes | `src/shared/locales/en.json`, `sv.json` |
| US-0034-AC7 red then green, suite green | yes | `tests/renderer/UpdateNotice.test.jsx`, PR #84 |
