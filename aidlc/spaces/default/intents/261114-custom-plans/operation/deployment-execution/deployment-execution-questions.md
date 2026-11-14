# Deployment Execution questions (v0.2.4)

Pre-deployment checks: the branch `release/v0.2.4` is cut from `main` (`0293db3`, same as `origin/main`), and `package.json` is bumped to `0.2.4`. There are no database migrations, no dependent services and no AWS target. The release goes to GitHub Releases only.

The local build of the `.dmg` (step 1 of `deployment-strategy.md`) stopped: the Mac's disk is full ("No space left on device"). Only 1.3 GB is free after removing the half-finished build, and a universal build needs more than that.

## Q1. [Release engineer] How do we get a 0.2.4 `.dmg` for your check of the four views?

A. I delete the old installers in `dist/` (`Auctum AIDLC Control-0.1.1`, `THADEUS-0.2.0` and `THADEUS-0.2.3`, about 650 MB, all also on their GitHub Releases) and build locally again.
B. I open the release PR now. Its CI run builds the `.dmg`, and I download it from the run for your check (about 220 MB). Nothing is deleted.
C. You free up disk space yourself and tell me when, then I build locally again.
X. Other (please specify)

[Answer]: A
**Mode:** chat

## Q2. [Tester] Does the local 0.2.4 build pass the four checks?

Built `dist/THADEUS-0.2.4-universal.dmg` (233 MB). The four checks, from `deployment-strategy.md` step 1:

- About shows the new LCARS design and version 0.2.4 (US-0409);
- the live token view moves while work runs (US-0207);
- the Plans view lists plans and can create one (US-0903);
- Monaco (US-1001): `out/renderer/assets/MonacoPane-Dmbtzqkj.js` (1.1 MB) opens in under 1 second, the app starts as fast as before, and editing works (the workers load).

A. Yes, all four work
B. Something is wrong (describe)
X. Other (please specify)

[Answer]: B. Everything works except the token consumption wave, which is not visible. Also reported: the Resume buttons are active while the work runs (screenshot 12.45.33).
**Mode:** chat

## Q3. [Tester] With the two fixes (US-0008 token wave, US-0009 Resume), does the rebuilt 0.2.4 `.dmg` pass?

Rebuilt `dist/THADEUS-0.2.4-universal.dmg` at 12:55 with both fixes. Check: the wave is a line across its box under the four meters, and the Resume buttons are disabled while the agent works in your terminal.

A. Yes, both work now
B. Something is still wrong (describe)
X. Other (please specify)

[Answer]: B. Resume is still not greyed (screenshot 14.55.35). Cause: the button was disabled but `.resume-button` had no disabled style, so it stayed amber. Fixed in `theme.css`; rebuilt at 14:59.
**Mode:** chat

## Q4. [Tester] With the grey disabled style, does the 14:59 `.dmg` pass?

Rebuilt `dist/THADEUS-0.2.4-universal.dmg` at 14:59. Check: while Claude runs in the app's tab (or wrote the audit log in the last 10 minutes), both Resume buttons are grey, and hovering shows why. The token wave is a line across its box.

A. Yes, it passes
B. Something is still wrong (describe)
X. Other (please specify)

[Answer]: A. Everything works now.
**Mode:** chat
