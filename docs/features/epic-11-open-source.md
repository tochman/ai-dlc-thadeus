# EPIC-11: Open Source — make the repository public and the app open source

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> The repository `tochman/aidlc-dash` is public since 2026-11-15, and the app is MIT-licensed (Copyright Auctum Solutions AB). Decided 2026-11-15: "we will make it an open repo and open source the app." This epic gets the repository ready to be public: what must not be published goes first, then the files a public project needs. Making it public is the person's own step.

**Stories:** US-1101, US-1102, US-1103

**Status (2026-11-20):** ✅ US-1101 released in v0.2.6. ✅ US-1102 and US-1103 released in v0.2.13. Each story names its release.

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
  - [x] Making the repository public is done only on the person's word (`gh repo edit --visibility public --accept-visibility-change-consequences`); afterwards, the release and its download URLs work without signing in.
- **Notes:** US-0413 (updates without `gh`) builds on the public repository.
- **Dependencies:** none

---

**US-1102: A visual first impression on GitHub, and topics to be found by** ✅ Released in v0.2.13
- As a **developer who comes across the repository on GitHub**, in order to **see at a glance what the app does and find it by topic**, I would like **a short animated GIF or screenshot gallery at the top of the README, and repository topics**.
- **Epic:** EPIC-11
- **Priority:** Low
- **Complexity:** Low
- **Background:** Asked for 2026-11-15: "a short animated GIF or screenshot gallery directly at the top of README.md (currently referenced as text captions) and repository topics (electron, ai-agents, developer-tools, aidlc) will significantly help discoverability."
- **Acceptance Criteria:**
  - [x] **Given** the repository page on GitHub, **then** the README opens with a short animated GIF (at most about 15 seconds and 5 MB) of the app at work, above the first heading's text, with alt text.
  - [x] The screenshots below it are a gallery of images with short captions, not text-only references.
  - [x] The GIF and the screenshots show only the demo project (no private paths, names or costs; US-1101 FR3.3), and `npm run screenshots` can retake them.
  - [x] The repository has the topics `electron`, `ai-agents`, `developer-tools` and `aidlc`, set only on the person's word (`gh repo edit --add-topic …`).
- **Notes:**
  - **Where.** `README.md`, `docs/screenshots/`, `scripts/screenshots.cjs` (could record frames for the GIF).
- **Dependencies:** US-1101

**US-1103: A README that shows what the app does today, how to use it, and what is coming** ✅ Released in v0.2.13
- As a **developer or team lead who finds the repository**, in order to **understand what the app gives me and my team and how to start**, I would like **the README rewritten from the delivered stories, with new screenshots, feature descriptions, usage and a section on upcoming features**.
- **Epic:** EPIC-11
- **Priority:** High
- **Complexity:** Medium
- **Background:** Asked for 2026-11-20. The README's features and screenshots (`docs/screenshots/`: intents, timeline, cost, features, splash) date from the early releases. Since then the app has gained, among other things, agent dialogs and the waiting popup, cost rules and model profiles, AI-DLC configuration and custom plans, harness choice, the editor, team collaboration and release planning, and Spec Kit is on the way.
- **Acceptance Criteria:**
  - [x] **Scan first.** Every ✅ delivered story in `docs/FEATURES.md` and the epic files is read, and the features that bring value to a developer or a team are listed, each with the stories it comes from. The list is kept with the story (in its intent or PR) so the choice can be checked.
  - [x] **Features.** The README describes those features by the value they bring (what the person or team can now do or see), grouped by topic, for a single developer and for a team, in plain words.
  - [x] **Screenshots.** Every screenshot is new, taken from the current app on the demo project (no private paths, names or costs; US-1101 FR3.3), with alt text and a short caption, and `npm run screenshots` can retake them.
  - [x] **Usage.** A usage section walks through the main flows: open a project, set up AI-DLC (and choose a harness), start and follow an intent, answer the agent, see the cost, plan a release.
  - [x] **Upcoming.** A section lists the planned features by release, taken from `docs/releases/` and the 📋 stories, and links to `docs/FEATURES.md`; it says plans can change.
  - [x] Prerequisites, installation, development, testing, security and contributing stay correct for the current version.
  - [x] Every link and image path in the README works.
- **Notes:** A documentation story, made directly without an AI-DLC workflow; the screenshot script may need new scenes. US-1102 (also v0.2.13, right after it) adds the animated GIF and the repository topics on top of this.
- **Dependencies:** US-1101
