# Requirements Analysis Questions: v0.2.9 release

All eleven stories in `docs/releases/0.2.9.md` are ✅ Done and merged (last: US-0214, #71). The release follows team.md § Deployment: release PR bumps `package.json`, `.dmg` check, green CI, merge, tag `v0.2.9`, manual smoke test. These questions cover only what is not already decided.

## Q1. [Release manager] The hand checks the stories still owe

Several stories were only tested in jsdom and owe a check in the running app: US-0213/US-0026 (resume at a gate after `/clear`, the PreCompact instruction, real opencode events, the LCARS look), US-0214 (live hook rows in Agent progress, legend toggles), US-0210 (the model-profile question shows within 2 s) and US-0303 (the Velocity view). The release checklist lists the US-0213/US-0026 ones as a gate before the tag. In v0.2.7 and v0.2.8 you waived such checks and tested after the release. When are they done?

A. All of them before the tag, in the built app; a failure becomes an EPIC-00 fix in this release
B. Only the US-0213/US-0026 ones from the checklist before the tag; the rest after the release
C. Waive them all and test after the release, as in v0.2.7 and v0.2.8; a failure becomes a v0.2.10 fix
X. Other (please specify)

[Answer]: A

## Q2. [Release manager] The `.dmg` check before the tag

team.md asks for a hand check of the built macOS `.dmg` before the tag. How is that `.dmg` made?

A. From the release pull request's CI run (`gh run download <run> -n mac`); you install and open it
B. Built locally with the project's build script on this Mac
C. Waive the `.dmg` check for this release
X. Other (please specify)

[Answer]: A

## Q3. [Release manager] The note for users on v0.2.8 or earlier

The app was renamed to `ai-dlc-thadeus` (US-0027), so a copy on v0.2.8 or earlier cannot update itself to v0.2.9 and must download it by hand once. The release workflow publishes with `--generate-notes`. Where does the note go?

A. At the top of the GitHub release notes (edited in after publishing) and in `docs/releases/0.2.9.md`
B. Only in the GitHub release notes
C. In the GitHub release notes, the README's install section and `docs/releases/0.2.9.md`
X. Other (please specify)

[Answer]: A
