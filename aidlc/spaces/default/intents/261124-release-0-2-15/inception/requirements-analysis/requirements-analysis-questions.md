# Requirements Analysis: questions

The v0.2.15 release: all five stories (US-0044, US-0045, US-0046, US-0508, US-0043) are merged into `main`. The team's gates are: the `.dmg` hand check, then green CI on the release pull request, then the merge, then the tag.

## Q1. [Release manager] The built macOS `.dmg` hand check before the tag

The team practice is to check the built `.dmg` by hand before tagging. v0.2.13 and v0.2.14 skipped it at your decision. The release pull request's CI also builds the `.dmg` (`build-mac`).

A. Do the check: I build it (`npm run build:mac`), you open it and confirm, then I tag
B. Do the check on the `.dmg` CI builds for the release pull request, then I tag
C. Skip it this time, as for v0.2.13 and v0.2.14; check the published build afterwards
X. Other (please specify)

[Answer]: A

## Q2. [Release manager] README screenshots

v0.2.14 refreshed the README screenshots and GIF before the tag. v0.2.15 adds the rename field in the intent detail and changes no views otherwise.

A. No new screenshots this release
B. Refresh them (`npm run screenshots`) in the release pull request
X. Other (please specify)

[Answer]: A

## Q3. [Release manager] Wait for CI before merging the release pull request?

A. Yes: merge only when `verify`, `build-mac` and `build-linux` are green
B. No: merge without waiting, as for v0.2.13
X. Other (please specify)

[Answer]: B
