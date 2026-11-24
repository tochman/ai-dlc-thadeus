import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Node for main-process modules, jsdom for renderer components.
// (Vitest 3+ replaced environmentMatchGlobs with projects; same split.)
// The hook script tests measure real time against the design's windows (US-0506 RD1), so they run as their own
// project after the others have finished, never beside a loaded machine (groupOrder 1).
// US-0210: every main test with a wall-clock limit, or that waits on real shells, git or file watching, runs here,
// after the parallel projects and one file at a time; under a full parallel run they went over on a loaded machine.
const TIMED = [
  'tests/main/dialogScript.test.js',
  'tests/main/dialogScriptReply.test.js',
  'tests/main/agentHooksGuard.test.js',
  'tests/main/agentHooksInstaller.test.js',
  'tests/main/agentPermissionAdapter.test.js',
  'tests/main/agentChannel.test.js',
  'tests/main/agentChannelScript.test.js',
  'tests/main/agentChannelSweep.test.js',
  'tests/main/velocity.test.js',
  'tests/main/git.test.js',
  'tests/main/planningSync.test.js', // US-0607: real git repositories
  'tests/main/watcher.test.js',
  'tests/main/frameworkChoiceTimed.test.js' // US-1406 NFR4.3
];
export default defineConfig({
  plugins: [react()],
  test: {
    // US-0506 NFR8.2: 80% line coverage floor, checked in CI. Never lowered to pass.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}', '.opencode/plugins/*.js'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 80,
        // The agent dialog files (US-0506 u1) each hold the floor on their own (NFR8.2).
        'src/main/agent*.js': { lines: 80 },
        'src/shared/agentText.js': { lines: 80 },
        'src/shared/agentOrder.js': { lines: 80 }, // US-0506 u2
        'src/shared/alertPlan.js': { lines: 80 }, // US-0506 u5

        'src/renderer/AgentDialog.jsx': { lines: 80 },
        'src/renderer/ReplyPage.jsx': { lines: 80 }, // US-0506 u3
        'src/renderer/LatestMessageStrip.jsx': { lines: 80 }, // US-0506 u3
        'src/renderer/AgentHooksStrip.jsx': { lines: 80 }, // US-0506 u4 (src/main/agentHooks.js is under agent*.js)
        'src/renderer/AgentHooksPreview.jsx': { lines: 80 }, // US-0506 u4
        'src/renderer/AgentHooksSection.jsx': { lines: 80 }, // US-0506 u4
        '.opencode/plugins/thadeus-dialog.js': { lines: 80 }
      }
    },
    projects: [
      {
        extends: true,
        test: { name: 'main', include: ['tests/main/**/*.test.js'], exclude: [...configDefaults.exclude, ...TIMED], environment: 'node' }
      },
      {
        extends: true,
        // US-0010: wall-clock tests retry up to twice under a loaded run; every attempt keeps its full limit.
        test: { name: 'scripts', include: TIMED, environment: 'node', sequence: { groupOrder: 1 }, retry: 2, fileParallelism: false }
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
