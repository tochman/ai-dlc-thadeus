import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Node for main-process modules, jsdom for renderer components.
// (Vitest 3+ replaced environmentMatchGlobs with projects; same split.)
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'main', include: ['tests/main/**/*.test.js'], environment: 'node' }
      },
      {
        extends: true,
        test: {
          name: 'renderer',
          include: ['tests/renderer/**/*.test.jsx'],
          environment: 'jsdom',
          setupFiles: ['tests/renderer/setup-i18n.js'] // i18n in Swedish (EPIC-07 US-0701)
        }
      }
    ]
  }
});
