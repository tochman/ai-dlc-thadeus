# Requirements Analysis Questions: US-1101, get the repository ready to be public

The code scan found what would become public. These questions settle what to keep, clean or remove. A history rewrite changes every commit id and needs your agreement, so it is asked explicitly.

## Question 1
The `aidlc/` folder holds 749 tracked files: audit logs with machine names, the prompts that were typed, cost figures and memory rules. What should happen to them?

A. Keep them public as they are: they show how the app was built with AI-DLC
B. Keep them, but clean them first (machine names, personal paths, anything private)
C. Stop tracking them from now on (`.gitignore`), and leave the existing history as it is
D. Remove them from the files and from the history (history rewrite)
X. Other (please specify)

[Answer]: B

## Question 2
Three of your personal email addresses are the author on 94 commits. What should happen to them?

A. Keep them: they become public with the history
B. Rewrite the history so those commits use your GitHub noreply address
C. Keep them, and use the noreply address for new commits only
X. Other (please specify)

[Answer]: A

## Question 3
Another private project, a reference project, shows through: four epic files name its local path, some test fixtures are copied from it (Swedish K2 accounting stories, an audit fixture), and two screenshots show its project tab, a branch and cost figures. What should happen?

A. Clean the files: neutral paths in the epics, invented content in the fixtures, new screenshots of a demo project
B. Clean the files and also remove the old versions from the history (history rewrite)
C. Keep them as they are
X. Other (please specify)

[Answer]: A

## Question 4
How should the secret scan of the whole history be done?

A. Run `gitleaks` locally once over the full history and resolve every finding
B. As A, and also add a `gitleaks` check to CI so new commits are scanned too
C. Use another scanner (please name it under X)
X. Other (please specify)

[Answer]: B

## Question 5
The packaged app ships no third-party licence notice. How should the licences be listed?

A. Generate a `THIRD_PARTY_LICENSES` file at build time from what the build actually bundles, and ship it in the app
B. Write the list by hand once and keep it in the repository
C. Generate it as in A, and also show it in the app's About window
X. Other (please specify)

[Answer]: C

## Question 6
AI-DLC's own files (`.claude/`, `.opencode/`, `.aidlc/`, `AGENTS.md`, `aidlc.settings.json`, `opencode.json`) would become public too. One test reads this repository's `.claude/settings.json`. What should happen to them?

A. Keep them public: they are how the project is worked on
B. Keep them, but remove personal and machine-local settings from them first
C. Remove them from the repository and fix the test that depends on `.claude/settings.json`
X. Other (please specify)

[Answer]: A

## Question 7
Which contact and code of conduct should the public files use?

A. Contributor Covenant 2.1, with `info@auctum.se` as the contact for conduct and security reports
B. Contributor Covenant 2.1, with security reports through GitHub's private vulnerability reporting and `info@auctum.se` for conduct
C. Another code of conduct or contact (please specify)
X. Other (please specify)

[Answer]: B

## Question 8
Should this story end with making the repository public?

A. Yes: at the end, on your explicit word, I run the visibility change and check that the release downloads work without signing in
B. No: this story only gets it ready; you make it public yourself later
X. Other (please specify)

[Answer]: A
