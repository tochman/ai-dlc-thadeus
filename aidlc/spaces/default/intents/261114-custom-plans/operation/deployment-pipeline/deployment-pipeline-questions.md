# Deployment Pipeline questions (v0.2.4)

Background: `.github/workflows/release.yml` already exists and v0.2.4 needs no change to it. On a `v*.*.*` tag it runs the test suite, builds the macOS `.dmg` and the Linux `.deb`, writes `SHA256SUMS.txt` and creates a GitHub Release. All five stories are already merged to `main` (#24–#29). For v0.2.3 you chose a regular release that becomes "latest", and fixing forward if it turns out broken (v0.2.3 Deployment Pipeline, Q2 and Q3). Build and Test says four things were checked only in the test environment so far: the About window, the live token view, the Plans view and the Monaco editor in the built `.dmg`.

## Q1. [Release engineer] How should v0.2.4 go out?

A. Same as v0.2.3: you check the four views in a locally built `.dmg` first, then I bump to 0.2.4 and open the release PR, and the tag publishes a regular release ("latest"). If it is broken, we fix forward.
B. As A, but publish as a prerelease first, and mark it "latest" by hand after you have tried the `.dmg` and `.deb` from the release.
X. Other (please specify)

[Answer]: A
**Mode:** chat
