import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

// Defaults: src/main/index.js, src/preload/index.js, src/renderer/index.html -> out/.
// build.externalizeDeps (default true) keeps every dependency, including the native
// node-pty and chokidar, out of the main bundle so they load from node_modules.
export default defineConfig({
  main: {
    build: { externalizeDeps: true }
  },
  preload: {
    build: { externalizeDeps: true }
  },
  renderer: {
    plugins: [react()]
  }
});
