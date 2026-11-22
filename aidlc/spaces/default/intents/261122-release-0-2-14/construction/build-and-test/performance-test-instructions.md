# Performance Test Instructions: Release v0.2.14

No performance targets are set for this release. One thing to watch by hand: the shared entrance animation (US-0417) must finish within about 0.8 s, animate only transform and opacity, never block clicks, and not run with reduced motion; the app's Animations setting switches it.
