# EPIC-11: Open Source — make the repository public and the app open source

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> The repository `tochman/aidlc-dash` is private today, and the app is MIT-licensed (Copyright Auctum Solutions AB). Decided 2026-11-15: "we will make it an open repo and open source the app." This epic gets the repository ready to be public: what must not be published goes first, then the files a public project needs. Making it public is the person's own step.

**Stories:** US-1101

**Status (2026-11-15):** ✅ US-1101 released in v0.2.6. Each story names its release.

---

## User Stories

**US-1101: Get the repository ready to be public** ✅ Released in v0.2.6
- As **the maintainer**, in order to **open-source the app without publishing anything private**, I would like to **review and clean what the repository and its history contain, and add what a public project needs**.
- **Epic:** EPIC-11
- **Priority:** High
- **Complexity:** Medium
- **Background:** Asked for 2026-11-15, after an update failed to download on a second machine: "we will make it an open repo and open source the app." Today 749 of the 1821 tracked files are AI-DLC records under `aidlc/`, and 9 tracked files name a home path or an email address.
- **Acceptance Criteria:**
  - [x] A review lists what would become public, with a keep, clean or remove decision for each:
    - the AI-DLC records (`aidlc/`): audit logs with machine names, the prompts that were typed, cost figures, memory rules;
    - personal paths and email addresses in tracked files;
    - test fixtures and screenshots;
    - anything that looks like a secret.
  - [x] A secret scan of the whole git history (for example `gitleaks`) finds nothing, or each finding is resolved; a secret that was ever committed is rotated, not just removed.
  - [x] What is decided as private is removed from the files, and from the history when it must not stay there (a history rewrite is agreed with the person first, since it changes every commit id).
  - [x] The repository has the usual public files: `README.md` written for outside users (what it is, install, build, test), `CONTRIBUTING.md`, `SECURITY.md` (how to report a vulnerability), `CODE_OF_CONDUCT.md`, and issue and pull request templates.
  - [x] The MIT `LICENSE` and the `license` field in `package.json` agree, and third-party licences in the packaged app are listed.
  - [ ] Making the repository public is done only on the person's word (`gh repo edit --visibility public --accept-visibility-change-consequences`); afterwards, the release and its download URLs work without signing in.
- **Notes:** US-0413 (updates without `gh`) builds on the public repository.
- **Dependencies:** none
