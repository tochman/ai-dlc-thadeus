# Performance Test Instructions: US-0504

Not applicable beyond NFR2. Each `aidlc` call times out at 30 s, and the start-up check runs after the window has loaded, so it never delays the first paint (tested in `tests/main/index.test.js`).
