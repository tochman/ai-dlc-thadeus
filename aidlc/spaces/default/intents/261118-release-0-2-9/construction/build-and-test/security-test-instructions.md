# Security Test Instructions: v0.2.9 release

The release changes no code paths. CI's gitleaks check still runs on the release pull request. The published release carries `SHA256SUMS.txt`; the smoke test (FR7) checks it against the downloaded files.
