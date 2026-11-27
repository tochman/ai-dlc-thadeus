# Astrometrics Drag-to-Tilt Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users tilt the Astrometrics activity ring with a bounded, persistent two-axis mouse drag while preserving hover and file-click behavior, and remove the rejected arches.

**Architecture:** Keep the interaction in `PulseView` and the projection math in pure helpers in `pulse/scene.js`. Render the ring scene through one bounded affine plane transform, invert that transform for pointer hit-testing, and keep the LCARS frame, standby panel, and hover callouts upright. Pointer capture and a small movement threshold separate dragging from existing click-to-open behavior.

**Tech Stack:** React, 2D Canvas, Vitest, Testing Library, Electron-Vite.

---

### Task 1: Add tested tilt projection helpers

**Files:**
- Modify: `src/renderer/pulse/scene.js`
- Test: `tests/renderer/pulseScene.test.jsx`

**Step 1: Write failing tests** for neutral projection, both drag axes, inverse mapping, and the bounded angle limit.

**Step 2: Run** `npx vitest run tests/renderer/pulseScene.test.jsx -t 'tilt projection'`; confirm the new helpers are missing or incorrect.

**Step 3: Implement** pure forward/inverse affine projection helpers with a neutral default and a 25-degree per-axis clamp. Keep the existing shallow ellipse projection as the base plane.

**Step 4: Re-run** the focused tests and verify forward-then-inverse mapping returns the original point within floating-point tolerance.

### Task 2: Apply the projection and preserve scene hit-testing

**Files:**
- Modify: `src/renderer/pulse/scene.js`
- Test: `tests/renderer/pulseScene.test.jsx`

**Step 1: Write failing tests** proving a tilted frame applies one coherent projection to scope, ring, marks, and labels, and `hitTest` still identifies the same file after inverse projection.

**Step 2: Run** `npx vitest run tests/renderer/pulseScene.test.jsx -t 'tilted frame|tilted hit'`; confirm the tilt option is not yet applied.

**Step 3: Implement** an optional tilt argument to `drawFrame`; transform the map layer as a unit, restore the context before screen-space hover callouts, and use the inverse helper in hit testing. Do not include tilt in the ring texture key.

**Step 4: Re-run** all `pulseScene.test.jsx` tests and confirm neutral tilt preserves the current frame and behavior.

### Task 3: Remove the rejected arches

**Files:**
- Modify: `src/renderer/pulse/scene.js`
- Test: `tests/renderer/pulseScene.test.jsx`

**Step 1: Replace the arch-specific expectation** with a regression assertion that the scene emits no decorative arch path or dashed inlay.

**Step 2: Run** `npx vitest run tests/renderer/pulseScene.test.jsx -t 'arches'`; confirm it fails against the current arch drawing.

**Step 3: Remove** `drawArches` and its invocation; preserve the ring, ellipse, shadow, scope, and corner brackets.

**Step 4: Re-run** the scene tests and confirm no arch strokes or dashed inlay remain.

### Task 4: Implement ring-only pointer dragging

**Files:**
- Modify: `src/renderer/PulseView.jsx`
- Test: `tests/renderer/PulseView.test.jsx`

**Step 1: Add failing interaction tests** for drag start only in the ring band, horizontal/vertical tilt, the movement threshold, retained orientation after release, pointer cancellation, and click-to-open when movement stays below threshold.

**Step 2: Run** `npx vitest run tests/renderer/PulseView.test.jsx -t 'tilt|drag|opens a file'`; verify the new interaction assertions fail.

**Step 3: Implement** pointer down/move/up/cancel handling with pointer capture, a 4 CSS-pixel threshold, 25-degree bounded deltas, and view-local tilt state. Suppress the synthetic click after a drag; leave normal file clicks unchanged.

**Step 4: Re-run** the focused view tests and confirm clicks, hover updates, cancellation, and release behavior all pass.

### Task 5: Verify the integrated view and tracked criteria

**Files:**
- Modify: `docs/features/epic-04-branding-and-desktop.md`

**Step 1:** Run `npx vitest run tests/renderer/PulseView.test.jsx tests/renderer/pulseScene.test.jsx` and confirm both renderer files pass.

**Step 2:** Run `npx electron-vite build` and confirm the production build succeeds.

**Step 3:** Capture populated and empty Astrometrics screenshots with the terminal hidden at 1280 px and 1600 px; review the neutral and tilted views for clipping, legibility, and an upright frame/panel.

**Step 4:** Mark the drag-to-tilt and no-arches criteria accurately in US-0419. Leave the story in progress until the remaining screenshots, full-suite verification, and release checks are complete.
