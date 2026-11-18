// US-0608 FR9: end-to-end tests of the built app (`npx electron-vite build` first). They launch Electron through
// Playwright's `_electron`, so no browser download is needed.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'tests/.tmp/e2e-results', // ignored by git, as the other test output
  timeout: 120_000,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list'
});
