# Smoke Test Results: v0.2.13

| Check | Result |
|---|---|
| Release published, not a prerelease | ✅ |
| All three files: `.dmg`, `.deb`, `SHA256SUMS.txt` | ✅ (the sums file lists the `.dmg` and `.deb`) |
| Tag run green (verify with suite, coverage, ESLint, Prettier, gitleaks, e2e) | ✅ run 44737806692 |
| `.dmg` checked by hand; About shows 0.2.13; 0.2.12 offered the update | ⏭ Not done: skipped at the person's request (ship now, fix in the next release) |
