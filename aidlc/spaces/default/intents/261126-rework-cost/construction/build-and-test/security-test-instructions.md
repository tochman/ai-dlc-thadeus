# Security Test Instructions: US-1301

Read only (NFR1): nothing is written in `aidlc/` or `.thadeus/`. The new IPC handler takes the intent from the open project, as the token-history handler does, and reads transcripts only inside the Claude projects folder (`loadTokenHistory`). The gitleaks scan runs in CI on the pull request.
