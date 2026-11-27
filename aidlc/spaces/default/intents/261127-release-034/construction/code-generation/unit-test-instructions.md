# Unit Test Instructions — US-0906

Run each step's tests on their own while building:

```bash
npx vitest run --project main tests/main/planDesign.test.js
npx vitest run --project main tests/main/plans.test.js
npx vitest run --project main tests/main/speckitHooksEdit.test.js
npx vitest run --project main tests/main/ipc.test.js
npx vitest run --project main tests/main/i18nKeys.test.js
npx vitest run --project renderer tests/renderer/PlanDesigner.test.jsx
npx vitest run --project renderer tests/renderer/PlansView.test.jsx
```

Style on the touched files:

```bash
npx eslint src/shared/planDesign.js src/main/plans.js src/main/speckitHooksEdit.js src/renderer/PlanDesigner.jsx src/renderer/PlansView.jsx
npx prettier --check src/shared/planDesign.js src/main/plans.js src/main/speckitHooksEdit.js src/renderer/PlanDesigner.jsx src/renderer/PlansView.jsx
```

Each Red step records the failing output before its Green step. The 80% line-coverage floor (`npx vitest run tests/ --coverage`) is checked by Build and Test, not here.
