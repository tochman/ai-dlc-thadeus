# Build Instructions: US-0802 Set up AI-DLC for another harness

- **Dependencies:** `npm install`. This work adds no new dependencies.
- **Build:** `npx electron-vite build`. `npm run dev` runs the app.
- **Verify:**
  1. Open a folder that has no AI-DLC yet, open the setup view, and choose opencode under "Harness".
  2. Check that the preview counts change.
  3. Press Apply. It shows running, then the result, and the app offers to switch the agent tab.
  4. In a project that already has AI-DLC, go to Projektinställningar → "Lägg till harness…", choose a harness that isn't installed, preview, and apply.
- **Troubleshooting:** a failed step shows the `aidlc` error in the dialog. Run the same command in a terminal to see more.
