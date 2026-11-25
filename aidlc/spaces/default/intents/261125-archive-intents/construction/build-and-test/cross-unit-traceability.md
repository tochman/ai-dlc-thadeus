# Cross-unit traceability

**Verdict: fail.** `NFR3` is uncovered: AI-DLC's real commands have not been run yet. Every other ID is covered.

- **FR1.1–FR7.2, NFR1, NFR2:** covered through the acceptance criteria below (zero-Unit work, built in code-generation).
- **AC1.1.1–AC6.1.3:** the target file of each is in `../code-generation/traceability.json`.
- **Where they ran:** component tests in jsdom, main tests in Node, the commit in real git. The head's layout at 1280 and 1920 ran in Electron's Chromium and fails at 1280 (see `test-results.md`).
