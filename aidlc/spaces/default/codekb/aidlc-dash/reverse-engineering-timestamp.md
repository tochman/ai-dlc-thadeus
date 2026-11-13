# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-13
- Commit: 8623af40b2eaf4b3676bb5dfad0e66865a2695b5

Fokuserad skanning för intent `261113-thadeus-name` (EPIC-04 US-0406: appen byter namn från "Auctum AIDLC Control" till T.H.A.D.E.U.S.) ovanpå en STALE store från intent `261113-question-popup` (byggd vid commit `22bd72191b37afd2377cf61d8dcc007132d963f5`, före US-0505 slogs ihop). Djupt lästes allt som bär appens namn eller identitet: renderarens `index.html`, splashen, märket, app-skalet, terminalpanelen, stilmallen, main-ingången, appmenyn, paketeringskonfigen (`package.json`, `electron-builder.yml`), releaseflödet, README och de tre testerna som hävdar namnet. Prosa utanför det området är bevarad; det som US-0505 gjorde inaktuellt i de lästa filerna (`QuestionPopup`, `questions:*`-kanalerna, `notify.js`/`questions.js`, `--alert`-token, nya inställningsnycklar, fler testfiler) är rättat. Tidigare djupt analyserade sökvägar som inte omlästes är nedflyttade till skummade. Byggutdata (`out/`, `dist/`), beroenden (`node_modules/`), testutdata (`tests/.tmp/`) och AI-DLC:s egen installation lämnades oöppnade.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: 261113-thadeus-name
fingerprint: a0c42ebda7a1c04d718fb3cea983f4b33810a29b
analyzed:
  paths:
    - src/renderer/index.html
    - src/renderer/Splash.jsx
    - src/renderer/theme.css
    - src/renderer/App.jsx
    - src/renderer/TerminalPanel.jsx
    - src/main/menu.js
    - src/renderer/AuctumMark.jsx
    - src/main/index.js
    - tests/main/menu.test.js
    - tests/renderer/AppShell.test.jsx
    - tests/renderer/Splash.test.jsx
    - .github/workflows/release.yml
    - package.json
    - README.md
    - electron-builder.yml
  components:
    - Theme Stylesheet
    - App Shell
    - Splash
    - AuctumMark
    - TerminalPanel
    - Renderer Entry
    - Main Entry
    - App Menu
    - Packaging Config
    - Release Pipeline
    - Project README
shallow:
  paths:
    - ./
    - src/main/parsers/audit.js
    - src/main/projectService.js
    - src/main/watcher.js
    - src/main/ipc.js
    - src/main/settings.js
    - src/main/notify.js
    - src/main/questions.js
    - src/main/parsers/intents.js
    - src/preload/index.js
    - src/renderer/
    - src/renderer/useProject.js
    - src/renderer/AppSettingsDialog.jsx
    - src/renderer/TerminalContext.jsx
    - src/renderer/QuestionPopup.jsx
    - src/renderer/ProjectView.jsx
    - src/renderer/DocsDialog.jsx
    - package-lock.json
    - tests/main/
    - tests/renderer/
    - tests/fixtures/
    - docs/FEATURES.md
    - docs/features/
    - build/icons/
```
