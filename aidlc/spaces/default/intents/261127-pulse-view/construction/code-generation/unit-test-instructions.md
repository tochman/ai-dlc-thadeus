# Unit Test Instructions: US-0418 Pulse view

Run the new tests on their own while building:

```
npx vitest run tests/main/pulse.test.js tests/main/pulseObserver.test.js tests/main/agentAdaptersPulse.test.js tests/renderer/PulseView.test.jsx tests/renderer/pulseScene.test.jsx
```

Before handing over, also run the tests of the touched modules, the i18n key check, and lint:

```
npx vitest run tests/main/agentAdapters.test.js tests/main/agentEvents.test.js tests/main/i18nKeys.test.js tests/main/theme.test.js tests/main/frameworkViews.test.js tests/main/featureDocsStatus.test.js tests/renderer/AppShell.test.jsx tests/renderer/ProjectView.test.jsx
npx eslint src/main/pulse.js src/main/watcher.js src/main/ipc.js src/main/agentAdapters.js src/main/agentEvents.js src/preload/index.js src/renderer/PulseView.jsx src/renderer/pulse src/renderer/App.jsx src/renderer/ProjectView.jsx
npx prettier --check src/main src/renderer tests/main tests/renderer
```

The 80% line-coverage floor applies to the full suite (`npx vitest run tests/ --coverage`), which Build and Test runs.
