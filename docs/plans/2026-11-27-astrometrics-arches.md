# Astrometrics Arches Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two subtle LCARS arch ribs around the Astrometrics ring and reduce the ring's top whitespace without obscuring labels, footer, or hit targets.

**Architecture:** Draw symmetric arch strokes in the existing canvas scene behind the ring, using the current LCARS theme tokens and ring geometry. Shift the ring's vertical center upward through fitted scene geometry so drawing, hover hit-testing, and click targets remain aligned; validate the 1280 px and 1600 px layouts with the existing Playwright screenshot harness.

**Tech Stack:** React, 2D Canvas, CSS theme tokens, Vitest, Playwright Electron harness.

---

### Task 1: Define arch geometry and verify its drawing

**Files:**
- Modify: `src/renderer/pulse/scene.js`
- Test: `tests/renderer/pulseScene.test.jsx`

**Step 1: Write a failing test** for two symmetric canvas arch strokes in a still frame, using recorded canvas calls and theme-derived colors.

**Step 2: Run** `npx vitest run tests/renderer/pulseScene.test.jsx -t 'arch'`; verify it fails because the arches are absent.

**Step 3: Draw** a pair of slim mirrored arch ribs behind the ring, with a restrained steel glow and sparse segmented highlights; keep them outside hit-testing and leave text upright.

**Step 4: Re-run** the focused test and the existing ring scene tests; verify both pass.

### Task 2: Tighten top spacing and re-verify the view

**Files:**
- Modify: `src/renderer/pulse/scene.js`, `src/renderer/PulseView.jsx`, `src/renderer/theme.css`
- Test: `tests/renderer/pulseScene.test.jsx`, `tests/renderer/PulseView.test.jsx`

**Step 1:** Add failing assertions that the ring center is raised while the ellipse, file labels, and hit tests stay aligned.

**Step 2:** Run the focused renderer tests and confirm the new assertions fail.

**Step 3:** Adjust the fitted vertical center and pointer conversion by the same offset; keep the ring, arch strokes, canvas labels, and hover callouts coherent.

**Step 4:** Run `npx vitest run tests/renderer/PulseView.test.jsx tests/renderer/pulseScene.test.jsx` and confirm all pass.

**Step 5:** Rebuild with `npx electron-vite build`, then capture both populated and empty terminal-hidden screenshots at 1280 px and 1600 px; review that the upper gap is reduced and the footer remains visible.
