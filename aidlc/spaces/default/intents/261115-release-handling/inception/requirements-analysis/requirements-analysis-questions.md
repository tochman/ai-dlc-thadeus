# Requirements Analysis Questions — US-0603 Releases or continuous deployment

Context: the story in `docs/features/epic-06-feature-docs.md` has nine acceptance criteria. Here is what the code gives us today:
- The project settings dialog (`ProjectSettingsDialog.jsx`, `PROJECT_DEFAULTS` in `src/main/settings.js`) already holds per-project feature-docs settings.
- The app can write a file inside the project safely (`writeFileSafe` in `src/main/fileWrite.js`, from US-1001).
- The lifecycle rule is saved by typing a request into the agent's terminal (`featureDocsPrompt.js`, US-0003).

These four questions settle what the story leaves open.

## Q1. [Product] What goes into v0.2.5?

This project ships in releases. The continuous-deployment half (🚀 Deployed, hiding the release fields, the other rule text) is about a third of the work.

A. All nine criteria in v0.2.5
B. Releases in v0.2.5 (the setting with both choices, release markers, the release list, the rule offer, the stale-marker flag); the 🚀 Deployed status and continuous-deployment views move to a follow-up story
X. Other (please specify)

[Answer]: A

## Q2. [Design] Where does the release list live?

A. A new "Releases" view beside Epics in the feature docs view
B. A section at the top of the feature docs view, above the epics
C. Its own entry in the left rail, next to the feature docs
X. Other (please specify)

[Answer]: A

## Q3. [Design] How does the person mark a story for a release?

A. In the story's detail: a release picker listing the planned releases and the next patch and minor versions (from the latest tag), with "None" to remove the marker
B. The same picker, plus free text for any version `vX.Y.Z` (checked before saving)
C. Free text only, checked as `vX.Y.Z`
X. Other (please specify)

[Answer]: A

## Q4. [Developer] How does the app offer to add or update the lifecycle rule?

US-0003 saves the rule by typing a request into the agent's terminal, and the agent saves it through AI-DLC.

A. The same way: a notice in the project view ("The story rule is missing or out of date") with a button that types the request into the agent tab; the person presses Enter
B. The app runs AI-DLC's own command to save the rule itself, with no agent involved (the project's memory changes the moment the person accepts)
X. Other (please specify)

[Answer]: A
