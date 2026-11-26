# Performance Test Instructions: US-1301

NFR4: the overview reads only the stored readings and the audit already loaded, so it reads no transcripts. The intent tab reuses `loadTokenHistory`'s cache. No load test is needed. To check by hand, open a project with many intents and see that the cost panel opens without a noticeable delay.
