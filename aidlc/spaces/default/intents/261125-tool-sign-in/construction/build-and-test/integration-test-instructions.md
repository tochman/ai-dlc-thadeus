# Integration test instructions

- **Setup:** vitest, and Playwright on the built app (Electron's Chromium). Nothing is installed.
- **Check to handler, with real shells and stand-in tools (Node):** `npx vitest run tests/main/signIn.test.js tests/main/exec.test.js tests/main/ipc.test.js tests/main/preload.test.js`
- **Rows, strip and the agent tab's line (jsdom):** `npx vitest run tests/renderer/SignIn.test.jsx tests/renderer/SettingsView.test.jsx tests/renderer/TerminalPanel.test.jsx tests/renderer/AppShell.test.jsx`
- **Built app:** `npx electron-vite build`, then `npx playwright test`. `signIn.spec.js` shows the states at 1280, the copy form with no project, and the line that types the command unsent.
- **By hand, once:** with the real `gh`, `claude` and `opencode`, open Settings › Tools and compare each state and account with the tool's own answer. Start an agent tab whose tool is signed out, and sign in from its line.
- **Test data:** stand-in scripts, a stand-in startup file and an own `HOME`, in temporary folders. No real account, tool or network.
- **Coverage:** the project's 80% line floor, from `npx vitest run tests/ --coverage`.
