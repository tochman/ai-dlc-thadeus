# Domain Design questions: US-0506 agent dialogs

Background: the app is one Electron app (main, preload, renderer, shared), and today it talks to agents only through their pty (`aidlc/spaces/default/codekb/aidlc-dash/architecture.md`). This work adds a channel from a hook script (Claude Code) and a plugin (opencode) to main, an event store in main, an answer path checked against the asking session, an installer for the committed hook entries, and a new dialog. These questions are only about where the boundaries go; exact hook names and fields are settled in Functional Design.

## Q1. [Architect] How should the hook script reach the app?

The committed hook script may use only what macOS and Linux provide by default: no Node.js, no app binary (FR4.6). It must wait for the person's answer (minutes), notice within 2 seconds when the app is gone (FR6.3), and accept events only from the app's own sessions through a per-session secret (NFR3).

A. Files: main makes a private folder per agent tab (mode 0700) and passes its path and a secret to the tab's environment; the script writes the hook's input there as one file and waits for main's answer file, checking every 100 ms and checking that the app is still alive. Plain `sh`, nothing to install
B. Local HTTP on 127.0.0.1 with a random port and the secret as a header; the script uses `curl`
C. A Unix domain socket per app run; the script uses `nc -U` or `curl --unix-socket`
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q2. [Architect] Where does the committed hook script live, and how are the app's entries in `.claude/settings.json` recognised?

The app must find, update and remove only its own entries, and AI-DLC rewrites the same file when it upgrades (Constraints, FR4.3, FR4.5).

A. A folder of the app's own at the project root, `.thadeus/hooks/`; an entry is the app's when its command runs a script in that folder. No extra keys in the settings file
B. The same folder, plus a small manifest file in it listing the entries the app wrote
C. Inside `.claude/hooks/thadeus/`, next to the harness's own files
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q3. [Architect] How do the new hook events and today's audit-log questions live side by side?

Today's audit-log source and screen-read answer stay as the fallback for projects without the hooks (FR4.5).

A. Per agent tab: once a tab's session has sent its first hook event (or the hooks are installed and current for that harness), only hook events are shown for that tab; otherwise that tab keeps today's audit-log questions. Both feed the same event store and dialog
B. Per project: hooks installed and current means hook events only for every tab; otherwise audit-log questions only
C. Both always, with duplicates merged by matching question text
X. Other (please specify)

[Answer]: B
**Mode:** guided

## Q4. [Developer] What happens to today's `QuestionPopup`?

A. A new dialog component replaces it; the fallback's audit-log questions are turned into the same event shape and shown by the new dialog, so there is one dialog
B. `QuestionPopup` is extended in place to show the new kinds
C. Both dialogs stay: the new one for hook events, the old one for the fallback
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q5. [Architect] Follow-up to Q3: a project with both Claude Code and opencode tabs

Q3 chose per project. A project can run a Claude Code tab and an opencode tab side by side, and the Claude Code hooks and the opencode plugin are installed separately, so one can be current while the other is missing.

A. Per project and per harness: Claude Code tabs use hook events when the Claude Code hooks are current, opencode tabs use plugin events when the plugin is current; a harness whose part is missing keeps today's audit-log questions
B. Strictly per project: the project uses hook events only when both the hooks and the plugin are current; otherwise every tab uses audit-log questions
X. Other (please specify)

[Answer]: A
**Mode:** guided
