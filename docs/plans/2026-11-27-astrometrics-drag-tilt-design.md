# Astrometrics Drag-to-Tilt Design

## Goal

Let a user tilt the Astrometrics activity ring in different directions by dragging it with a mouse, while preserving existing hover and click-to-open behavior.

## Interaction

- A drag starts only when the pointer is pressed on the visible ring, not elsewhere in the instrument canvas.
- Horizontal and vertical pointer movement tilt the ring on two axes. Tilt is restrained and bounded to keep the LCARS instrument readable.
- A small movement threshold distinguishes a drag from a click. A click without meaningful movement keeps opening the hovered file as it does today.
- The final orientation stays when the pointer is released, until another drag or the view is left. It is not persisted across view visits or app restarts.
- Pointer capture keeps the drag active if the pointer leaves the ring. Cancellation or loss of the pointer ends the gesture safely.

## Rendering and input mapping

Use a bounded affine projection of the existing canvas plane rather than a CSS transform or a new 3D renderer. The activity ring and its scope, marks, traces, and labels share the projection. The surrounding LCARS frame and HTML standby panel remain upright. Hover callouts remain legible in screen space.

Pointer coordinates are mapped through the inverse projection before file/agent hit-testing. Ring-only drag eligibility uses the same fitted ring geometry. The transform is view state and requires no new dependency or persistence layer. The already-rejected decorative arches are not part of this design; retain the ring, ellipse, shadow, and scope.

## Motion and edge cases

Clamp both axes to a modest range (initial target: approximately 25 degrees), ignore movement beyond the clamp, and never change the event data or its layout. Apply drag changes directly; reduced-motion users do not get transition animation. Preserve pointer-leave hover cleanup when not dragging, existing click-to-open behavior, and the view's default orientation when reopened.

## Verification

- Unit-test projection and inverse-coordinate behavior at neutral and tilted orientations, including clamping.
- View-test ring-only drag start, pointer capture/release/cancel, click-versus-drag threshold, persistent orientation after release, and unchanged file opening on click.
- Run the renderer suite and capture the populated and empty Astrometrics view with the terminal hidden at 1280 px and 1600 px. Confirm the LCARS frame and standby panel stay upright and ring labels/callouts remain readable.

## Alternatives considered

1. **Bounded canvas-plane affine projection (selected):** applies one coherent transform to the existing drawing and reverses it for hit-testing; moderate scope and no dependency.
2. **CSS-transform the canvas:** quick to prototype, but transformed bounds complicate pointer mapping and can make layout/clipping less reliable.
3. **Full 3D projection:** offers more realistic perspective, but requires reprojecting every drawn element and interaction target for little added value at this scale.
