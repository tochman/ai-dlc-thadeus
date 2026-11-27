# EPIC-04: Branding, Look & Desktop Integration

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Auctum AIDLC Control should look and behave like a proper Auctum desktop app wherever it shows up: in the Dock, the application menu, the window switcher, the installer and the Linux launcher. Inside the app it should feel like a living bridge console. EPIC-01 added the name, splash screen, in-app logo and the restrained LCARS theme. This epic covers the parts of the operating system that still show Electron defaults, and the motion and light that make the theme come alive without hurting readability.

**Stories:** US-0401, US-0402, US-0403, US-0404, US-0405, US-0406, US-0407, US-0408, US-0409, US-0410, US-0411, US-0412, US-0413, US-0414, US-0415, US-0416, US-0417, US-0418, US-0419

**Status (2026-11-27):** ✅ US-0401–US-0411 released (v0.1.1–v0.2.5). ✅ US-0412 released in v0.3.1. ✅ US-0413 released in v0.2.7. ✅ US-0414 released in v0.2.8. ✅ US-0415 released in v0.2.13. ✅ US-0416 released in v0.2.14. ✅ US-0417 released in v0.2.14. ✅ US-0418 released in v0.3.3. 🚧 US-0419 in progress, for v0.3.31. Each story names its release.

---

## User Stories

**US-0401: Auctum app icon on macOS and Linux** ✅ Released in v0.1.1
- As a **user at Auctum**, in order to **recognise the app at a glance**, I would like to **the Auctum mark as the app icon everywhere the operating system shows it**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Low
- **Acceptance Criteria:**
  - [x] The icon is generated from the new geometric mark (the same paths as `src/renderer/AuctumMark.jsx`), not the older variants in `public/logos/`. It is centred on a background that works in light and dark Docks (`build/icon.svg`: amber mark on a dark rounded square, macOS icon grid).
  - [x] The design is checked with the user before release.
  - [x] macOS: the `.icns` with all required sizes is derived by electron-builder from `build/icon.png` (1024×1024), so Dock, Finder, the app switcher and the `.dmg` window show the Auctum icon and electron-builder no longer warns "default Electron icon is used".
  - [x] Linux: the PNG sizes for the `.deb`'s `.desktop` entry are derived by electron-builder from `build/icon.png`, and the window gets the icon via `BrowserWindow` (`resources/icon.png`), so the application menu and window list show the Auctum icon
  - [x] In development (`npm run dev`) the Dock icon is also Auctum (`app.dock.setIcon` on macOS)
  - [x] The icon sources (`build/icon.svg`, `build/icon.png`) and the command that generates them (`npm run icon`, `scripts/make-icon.cjs`) are committed, so the icon can be regenerated
  - [ ] Verified on an installed release on macOS and on Linux *(macOS: verified on the installed v0.2.3 on 2026-11-14. Linux: still to check, on the `.deb` from the v0.2.3 release.)*
- **Dependencies:** US-0109, US-0110

**US-0402: Living LCARS — glow and motion** ✅ Released in v0.2.0
- As a **nerdy developer at Auctum**, in order to **feel that I am sitting at a living bridge console while agents work**, I would like to **the LCARS elements to have a soft glow and purposeful animations that react to what is happening**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] **Glow:** LCARS elbows, panel bars and active buttons have a soft outer glow in their accent colour (amber, lavender, blue), stronger on hover and focus. Body text and tables never glow, and contrast stays at least WCAG AA (4.5:1). *Built per the approved mock-up instead: only live elements glow (steel breathing, coral pulse, the Auctum mark on the splash); hover brightens a block and focus is an amber outline.*
  - [x] **Live state:** an intent or stage that is in progress has a slow "breathing" glow on its marker. A stage that is waiting for approval pulses (in coral, per the mock-up), so it stands out as needing the person. The live indicator gets a pulsing dot.
  - [ ] **Transitions:** switching project tabs, intent and detail tabs (Pipeline, Tidslinje, Units, Filer, Kostnad) uses short slide/fade transitions (150–250 ms). Panels and elbows "power up" once when a project opens (a staggered reveal of at most 600 ms in total). *Built: the power-up (bars draw out in ≤ 540 ms, frames fade in) and 150–250 ms hover/colour transitions. Not built: slide/fade between tabs.*
  - [ ] **Events:** a new audit event slides into the timeline with a brief light sweep in its category colour. A stage that completes gives a short confirmation flash on its pipeline row. *Built: the 400 ms light sweep (steel) on new events. Not built: the flash on a completed stage.*
  - [ ] **Ambient detail (subtle):** LCARS bars can show small, slowly updating segment blocks or numbers as decoration, like on a ship console. They are never animated so fast or so brightly that they distract from content, and they can be turned off. *Left static, as in the approved mock-up.*
  - [x] **Accessibility and comfort:**
    - With `prefers-reduced-motion` and no saved choice, the default is Dämpad: static glow, no loops, no sweep (approved change; Av turns all motion off).
    - A setting "Animationer: Full / Dämpad / Av" (default Full) is remembered in the app's settings (Inställningar in the left arm).
    - Nothing flashes more than 3 times per second.
  - [x] **Performance:** animations use CSS transforms, opacity and `filter`/`box-shadow` only (no layout thrash). The app stays at 60 fps on an ordinary laptop with a project of 25 intents and 2 000 timeline events, and idle CPU does not rise noticeably from the ambient effects. *Only those properties animate (the sweep moves a background image); 60 fps is measured in Build and Test.*
  - [x] No Star Trek trademarks, sounds or copied assets: the effects are inspired by LCARS only (as in US-0109).
- **Dependencies:** US-0109, US-0103, US-0104, US-0107

**US-0403: LCARS design refresh — palette, frames and data elements** ✅ Released in v0.2.0
- As a **developer who keeps the console open all day**, in order to **read the state of the work at a glance in an interface that feels calm, precise and coherent**, I would like to **the LCARS look reworked into a richer, more restrained design language: a slate-and-steel-blue palette with coral accents, nested frames, labelled blocks and dense data readouts**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Medium
- **Inspiration (reference images shared 2026-11-13, used for style only):** modern LCARS-style screens with mostly slate grey-blue structure, steel blue for live data and coral reserved for alerts and emphasis, on a near-black background with plenty of empty space.
- **Design language:**
  - **Palette (tokens on `:root`):**
    - structure in three slate steps (about `#2e3448`, `#4f5873`, `#6e7591`)
    - steel blue for data and the active state (about `#4fa3d9`, dark `#24405c`)
    - coral for attention and errors (about `#ef6f5a`, soft `#f2a389`)
    - text near-white and grey-blue
    - Auctum amber is kept for the brand mark and the single primary action
    - the exact values are settled in design and checked for WCAG AA contrast
  - **Frames:** thick rounded elbows nested inside each other (outer frame around the app, inner frame around the content area), joined by bars of different lengths with small gaps, like the reference images.
  - **Labelled blocks:** buttons and tiles are solid blocks with the label in condensed capitals, right-aligned at the bottom edge. A thin coloured tab sits beside a block to mark its state (blue = active, coral = needs attention).
  - **Data readouts:** numbers in tabular, condensed type in tidy columns with small square colour markers, used for cost, tokens, stage counts and audit totals.
  - **Rules and stripes:** groups of hairlines as dividers and decoration, sparingly.
  - **Indicators:** a row of dots for pipeline progress (filled = done, outlined = left, blue = current, coral = waiting for approval). A tick-scale rail for progress bars.
  - **Small outlined chips** for IDs and metadata (for example `US-0501`, `261113-workflow-control`, the scope).
  - **Typography:** Antonio (already bundled) in capitals for headings and labels. Large headings in steel blue, as in the references.
- **Acceptance Criteria:**
  - [x] **Given** the new tokens, **then** every colour in `theme.css` comes from them. No hard-coded colours are left in components, and the old amber/lavender LCARS palette is replaced, except the Auctum mark and the primary action. *Guarded by `tests/main/theme.test.js`.*
  - [x] **Given** the project view, **then** the sidebar and the content area sit inside nested elbow frames, and the terminal panel is framed by the bottom elbow, consistent at window widths from 1100 px to 2560 px. *Built as in the mock-up: the outer frame (amber Auctum elbow, left arm, bottom elbow around the terminal) holds everything, the inner frame holds the content. Checked at 1100 and 1440 px; 2560 px is checked in Build and Test.*
  - [x] **Given** the intent list, the pipeline and the cost panel, **then** they use labelled blocks, the dot progress indicator, tick rails and data-readout columns as described above. *Tick rails are left out, as in the approved mock-up.*
  - [x] Coral is used only for errors, failed stages and "waiting for your approval". Blue marks only the active or current item.
  - [x] All text meets WCAG AA contrast against its background, and no state is shown by colour alone (each also has a label, shape or icon). *Every state has text; the pairs come from the mock-up's checked palette, and spot checks are done in Build and Test.*
  - [x] Decorative elements (stripes, numeric decoration) are `aria-hidden` and never contain invented data that could be taken for real. Every number shown is a real value from the project.
  - [x] No Star Trek assets, ships, names, logos or sounds. The look is inspired by the style only.
  - [x] Existing tests stay green, and existing `data-testid`s are kept.
- **Notes:** Built together with US-0402 (glow and motion), since both touch `theme.css` and the frame components. Before code, a static mock-up of the project view is reviewed and approved.
- **Dependencies:** US-0103, US-0104, US-0105, US-0402

**US-0404: Full screen and an app menu of its own** ✅ Released in v0.2.0
- As a **developer who keeps the console up on a screen of its own**, in order to **give the bridge view the whole screen and not see menu items that mean nothing in this app**, I would like to **a full-screen mode, and a menu with only the commands the app actually has instead of Electron's default menus**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Low
- **Background:** The app has no menu of its own today, so Electron's default menus show (on macOS: Edit, View with Reload/Toggle DevTools, Window, Help with Electron links; on Linux a menu bar in the window). Several of them (Reload, Force Reload, Toggle Developer Tools, "Learn More" about Electron) are misleading or risky in a finished app.
- **Acceptance Criteria:**
  - [x] **Full screen:** the person can switch to full screen and back with the menu item "Helskärm", with the standard shortcut (macOS `Ctrl+Cmd+F`, Linux `F11`) and with a button in the app (an LCARS block, for example in the top bar or under "Inställningar"). The view adapts without the frames breaking. On macOS the native full-screen mode is used.
  - [x] **The choice is remembered** in the app's own `settings.json`: the app opens in full screen if it was closed in full screen.
  - [x] **App menu of its own** (`Menu.setApplicationMenu`) replaces Electron's default. It contains only what the app does:
    - **macOS app menu:** "Om Auctum AIDLC Control" (Auctum symbol, version), "Inställningar…" (`Cmd+,`), Hide / Hide others / Show all, "Avsluta Auctum AIDLC Control".
    - **Arkiv / Projekt:** "Öppna projekt…" (`Cmd/Ctrl+O`), "Stäng projekt" (`Cmd/Ctrl+W`), "Projektinställningar…".
    - **Redigera:** Undo, Redo, Cut, Copy, Paste, Select all (needed for text fields and the terminal).
    - **Visa:** Intents, Features, Kostnad, Github (same as the left arm), Helskärm, zoom in/out/reset.
    - **Terminal:** Claude, Shell, "Starta om flik".
    - **Fönster** (macOS): Minimize, Zoom, Bring all to front.
    - **Hjälp:** "AI-DLC-dokumentation" (opens the project's docs or the AI-DLC repo in the browser) and "Rapportera problem" (the repo's issues page).
  - [x] **Removed:** Reload, Force Reload, Toggle Developer Tools and the Electron links are not in the menu in a packaged app. In development (`npm run dev`) a "Utveckling" menu with Reload and DevTools stays available.
  - [x] **Linux:** the menu bar is hidden by default (`autoHideMenuBar`) and shown with `Alt`, so the LCARS frame owns the window. All functions are also reachable inside the app.
  - [x] Menu labels are in Swedish, with the same names as the left arm. Every menu command is handled by the same function as the button in the app (one code path).
  - [x] Menu items that need an open project are disabled when no project is open.
- **Dependencies:** US-0403 (the left arm and its views), US-0101

**US-0405: Settings view with native file pickers** ✅ Released in v0.2.3 (intent `261114-settings-view`)
- As a **developer who runs the console in full screen**, in order to **change the app's settings and point it at the right tools without leaving the bridge view or hunting for config files**, I would like to **a full settings view inside the app, where paths are chosen with the operating system's own file dialogs**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Today the app finds `aidlc` and `claude` through the login shell's PATH, and settings are spread over small dialogs (Animationer in US-0402, Projektinställningar in EPIC-06). In full screen (US-0404) a separate dialog window feels out of place, and there is nowhere to fix a tool the app cannot find.
- **Acceptance Criteria:**
  - [x] **A settings view** opens from "Inställningar" in the left arm, from the menu ("Inställningar…", `Cmd/Ctrl+,`) and works in full screen. It is a view in the content frame, in the LCARS style, not a separate window. It has sections as labelled blocks: **Verktyg**, **Utseende**, **Projekt**, **Om**.
  - [x] **Verktyg (tools):**
    - path to the **AI-DLC CLI** (`aidlc`), the **Claude Code CLI** (`claude`) and the **shell** for the terminal tabs
    - each one shows what was found automatically (via the login shell's PATH) and its version (`aidlc --version`, `claude --version`, run with fixed arguments and no shell)
    - "Välj…" opens the **native file dialog** (`dialog.showOpenDialog`, files only) to point at another binary, and "Återställ" goes back to automatic
    - a chosen path is checked before it is saved: the file exists, is executable, and `--version` answers. Otherwise a short message explains why it was not saved.
    - all places that start `aidlc` or `claude` (setup, models, the terminal tabs) use the chosen path
  - [x] **Utseende:** Animationer (Full / Dämpad / Av, from US-0402), Helskärm vid start (US-0404) and, once EPIC-07 is built, Språk.
  - [x] **Projekt:**
    - the default folder for "Öppna projekt…", chosen with the native folder dialog
    - the list of recently opened projects, where entries can be removed
    - a link to each open project's Projektinställningar (EPIC-06)
  - [x] **Om:** the app version, the AI-DLC version found, the Auctum symbol, and links to the repo and the feature docs.
  - [x] Settings are saved in the app's own `settings.json`, validated by `sanitize()`. Nothing is written into any project. Paths are stored as absolute paths and never passed through a shell.
  - [x] The existing small dialogs either move into this view or open it at the right section, so each setting has one home.
  - [x] Keyboard and screen readers: every field has a label, file buttons have names ("Välj sökväg till aidlc"), and focus moves into the view when it opens.
  *Verified in `261114-settings-view`: 36 scoped unit tests and 224 in the full suite, plus `electron-vite build`. The native file and folder dialogs, a real `--version` answer and "a saved path is used on the next start" are checked on an installed release at the v0.2.3 tag — the same point where US-0401's installed-release criterion closes.*
- **Dependencies:** US-0402, US-0403, US-0404, EPIC-06

**US-0406: Name the application T.H.A.D.E.U.S.** ✅ Released in v0.2.1 (intent `261113-thadeus-name`)
- As **the product owner**, in order to **give the application an identity that says what it is: an environment where people and AI build software together, not just a dashboard**, I would like to **rename the application T.H.A.D.E.U.S. everywhere a user sees its name**.
- **Epic:** EPIC-04
- **Priority:** High
- **Complexity:** Low
- **Background:** Today the app is called "Auctum AIDLC Control" (repo `aidlc-dash`). The new name:
  - **T.H.A.D.E.U.S.**: *Transformative Human-AI Development Environment for Ubiquitous Systems*
  - Tagline: *AI-driven software development, under human direction.*
  - Why the name fits:
    - **Transformative:** the ambition to change how software is built.
    - **Human-AI:** people and AI work together.
    - **Development Environment:** more than a dashboard or a project tracker.
    - **Ubiquitous Systems:** made for a world where intelligent, connected systems are everywhere.
- **Acceptance Criteria:**
  - [x] **Name, spelled out and short:** the display name is "T.H.A.D.E.U.S." (with dots). Where dots do not work (file names, the app bundle, the deb package, bundle id), a fixed short form is used: "THADEUS" for the bundle and installer, `thadeus` for the package. The repo name `aidlc-dash` is unchanged.
  - [x] **Everywhere the user sees the name:** *All forms come from `src/shared/appName.js`. The Dock and Finder show the bundle name "THADEUS" (`productName`, without dots); the menus, the About panel and the Linux launcher show "T.H.A.D.E.U.S.".*
    - the splash
    - the brand block in the header elbow
    - the window title and `<title>`
    - the macOS app menu: "Om T.H.A.D.E.U.S.", "Göm …" and "Avsluta …"
    - the About panel
    - the Dock and launcher name
    - Linux `.desktop` entry
    - `productName` in `package.json` and `electron-builder.yml`
    - the release title in GitHub Actions
    - the artifact names (`THADEUS-<version>-universal.dmg` and `thadeus_<version>_amd64.deb`)
    - README
  - [x] **Full name and tagline:** the splash shows the spelled-out name ("Transformative Human-AI Development Environment for Ubiquitous Systems") and the tagline "AI-driven software development, under human direction." under the short name. The About panel shows the same, and the README introduces the app with them.
  - [x] **The Auctum symbol stays:** the Auctum mark (US-0401, US-0403) keeps its place in the header elbow, on the splash and as the app icon. How the name and Auctum stand together (for example "T.H.A.D.E.U.S. · by Auctum") is decided in requirements analysis. *Decided: the header shows the mark and only "T.H.A.D.E.U.S."; the About panel says "© Auctum".*
  - [x] **Nothing is lost on upgrade:** saved settings, open projects and the window state survive. The userData folder stays `aidlc-dash`, as it did at the last rename. A user who installed v0.2.0 gets the new name without losing anything. On macOS the new app replaces the old one, or the README says to remove "Auctum AIDLC Control" from Applications.
  - [x] **Layout holds:** the new name and the longer sub-line fit the header elbow and the splash at 1100 px width without breaking the LCARS frames. They keep WCAG AA contrast. *Built (one line with `nowrap` in the header, balanced wrapping on the splash, existing AA token pairs); measured with screenshots in Build and Test.*
  - [x] Tests that check the name (the splash `role="img"` contract, the menu labels in `menu.test.js`, settings paths) are updated to the new name. No old name is left in user-facing text. The design doc and feature docs mention the old name only in history.
- **Dependencies:** US-0401, US-0403, US-0404

**US-0407: Update the app from a GitHub release** ✅ Released in v0.2.3 (intent `261114-intent-0-2-3-release`)
- As a **developer using THADEUS day to day**, in order to **stay on the latest version without hunting for the download**, I would like to **have the app find a new release on GitHub, download it, install it and restart, and optionally remove the downloaded package afterwards**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Releases are built by `.github/workflows/release.yml` on a `v*.*.*` tag, as a macOS `.dmg` and a Linux `.deb` (`electron-builder.yml`). The macOS build is unsigned (`identity: null`). Electron's built-in auto-updater (Squirrel.Mac, used by `electron-updater`) only installs signed apps, so on macOS the app has to download the DMG and either hand it to the person or replace the app bundle itself. On Linux, installing a `.deb` needs root (`pkexec dpkg -i`), whereas an AppImage could replace itself.
- **Acceptance Criteria:**
  - [x] **Check:**
    - On start (at most once a day) and from the app menu ("Sök efter uppdatering…"), the app reads the latest release from the GitHub API for `tochman/aidlc-dash`, with no token, and compares its tag with `app.getVersion()` (semver).
    - Pre-releases and drafts are ignored.
    - When offline or rate-limited, it says so in one sentence and tries again later. It never blocks the app.
  - [x] **Offer:** a new version shows a calm notice (LCARS, not a modal), with the version, the release notes rendered as Markdown, and **Update now**, **Later** and **Skip this version**. A skipped version is saved in the app's own `settings.json`.
  - [x] **Download:** only the asset for this platform and architecture (macOS `.dmg` arm64/x64, Linux `.deb` amd64/arm64), over HTTPS from GitHub's release assets, into a temporary folder under userData, with progress shown. When the release publishes a checksum, it is verified, and a mismatch stops the update.
  - [ ] **Install and restart:** *(Built and unit-tested with fakes. Not yet run on a real machine; it is checked on the first update from v0.2.3 to a later release.)*
    - macOS: mount the DMG, copy the new `THADEUS.app` over the running one with the person's rights (asking for admin rights only when `/Applications` needs them), clear the quarantine flag the way the README describes for the unsigned build, then relaunch with `app.relaunch()` + `app.quit()`.
    - Linux: install the `.deb` through `pkexec dpkg -i`, which shows the system's password prompt, then relaunch.
    - If any step fails, the app keeps running on the old version, says in one sentence what failed, and offers to open the downloaded file in Finder or the file manager instead.
  - [x] **Before restarting:** if an agent tab is "Arbetar", the person is asked first, because a restart ends the terminal sessions. Open projects and settings survive the restart (userData stays `aidlc-dash`).
  - [x] **Clean up (optional):** a setting, "Ta bort hämtat paket efter uppdatering: På / Av" (default På), removes the downloaded DMG or `.deb` after a successful install. With it off, the file is kept and its path shown.
  - [x] **Safety:** only `github.com/tochman/aidlc-dash` release assets are downloaded. The URL and asset name are checked against that repository before download. Nothing downloaded is run except by the platform's installer step above.
- **Notes:** Added 2026-11-14 at the person's request. Signing the macOS app would allow the standard `electron-updater` flow; that is a separate choice.
- **Dependencies:** US-0404 (app menu), the release workflow

**US-0408: See which version is running in an "Om T.H.A.D.E.U.S." window** ✅ Released in v0.2.3 (intent `261114-intent-0-2-3-release`)
- As a **developer using THADEUS**, in order to **know which version I'm running (for example after an update)**, I would like to **open "Om T.H.A.D.E.U.S." from the menu and see the splash screen's logo and name together with the app version**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Low
- **Acceptance Criteria:**
  - [x] The app menu (macOS) and Hjälp (Linux) have **"Om T.H.A.D.E.U.S."**, replacing the Electron default About panel (`role: 'about'`).
  - [x] It opens an LCARS popup with the same content as the splash screen: the Auctum mark, `APP_NAME`, `APP_FULL_NAME` and `APP_TAGLINE` from `src/shared/appName.js`.
  - [x] The popup also shows the app version (`app.getVersion()`, the same value as the Om section in Inställningar, US-0405).
  - [x] It closes with Esc, a Stäng button or a click outside, and focus returns to where it was.
  - [x] Swedish and English texts.
- **Notes:** Added 2026-11-14 at the person's request, during v0.2.3's Build and Test.
- **Dependencies:** US-0404 (app menu), US-0406 (name and splash)

**US-0409: The About window in the new LCARS design** ✅ Released in v0.2.4 (intent `261114-custom-plans`)
- As a **developer using THADEUS**, in order to **have the About window look like the rest of the bridge console**, I would like to **see it in the person's new design: an LCARS elbow frame with bars, labels and an EXIT block**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Low
- **Background:** The person shared a better design on 2026-11-14 (reference screenshot `Screenshot 2026-11-14 at 08.57.52.png`). The screenshot guides layout, shape and colour only (FR9.5: no copied text or assets).
- **Acceptance Criteria:**
  - [x] A rounded LCARS elbow frames the content on the left, top and bottom, with small code labels in the frame and a small status row at the bottom.
  - [x] The title (`APP_NAME`) sits top right in the accent colour.
  - [x] `APP_FULL_NAME`, `APP_TAGLINE` and the app version sit in light horizontal bars, each with a coloured end tab and a line under it, beside the Auctum mark.
  - [x] An EXIT block in the frame's left edge closes the window, like Stäng did. Esc, a click outside and the focus return still work (US-0408).
  - [x] Swedish and English texts, 4.5:1 contrast, and motion that follows the animations setting.
- **Notes:**
  - `src/renderer/AboutDialog.jsx` and the `.about-lcars-*` rules in `src/renderer/theme.css`.
  - The elbow is a CSS grid: the arm spans every row, and the main area overlaps it by its corner radius.
  - The code labels come from the version and platform (`codeLabels()`). EXIT/STÄNG comes from `aboutDialog.exit`.
  - Colours are the existing tokens only. Measured contrast: bar text 7.8:1, EXIT 13.6:1, title 9.9:1, status row 12.2:1.
  - No new animation: the mark's glow already follows the animations setting.
  - Test: `tests/renderer/AboutDialog.test.jsx`. No screenshot was taken in this build (no screen access); one is due before the release.
- **Dependencies:** US-0408

**US-0410: Settings in LCARS tabs, with every tool the app needs checked** ✅ Released in v0.2.5 (intent `261115-lcars-settings`, ultra-express)
- As a **developer setting up and tuning the console**, in order to **find a setting at a glance and know the app has everything it needs**, I would like to **have Settings as animated LCARS tabs, and see every tool the app runs checked, opencode and the GitHub CLI included**.
- **Epic:** EPIC-04
- **Priority:** High
- **Complexity:** Medium
- **Background:** Asked for 2026-11-15 with a screenshot of today's Settings: one long scrolling page; notification settings sit under Appearance; a long Claude Code path breaks mid-word. "We want it more LCARS and animated, perhaps use tabs (but LCARS-style)" and "opencode and gh cli is missing".
- **Acceptance Criteria:**
  - [x] Settings shows LCARS-style tabs (pill buttons like the side rail): Tools, Appearance, Notifications, Project, About. One tab's panel shows at a time, in an LCARS frame with an elbow and a header bar. Each tool is an LCARS card (see US-0411 for the card's anatomy); the card is built here once as a shared style.
  - [x] Notifications holds the questions-from-AI-DLC, agent dialog and reply settings and the sound; Appearance keeps animations, full screen at start and language.
  - [x] Choosing a tab lights its pill and sweeps to its panel; rows appear one after another. Reduced gives a static glow, Off no motion, as the animations setting does everywhere.
  - [x] Tools lists the AI-DLC CLI, Claude Code, **opencode**, the **GitHub CLI (`gh`)** and the shell, each with path, version, "found automatically" or the chosen path, and Choose…. A chosen path is used the next time the app runs that tool.
  - [x] A tool that is not found says so and what it is needed for (for example: opencode for opencode agent tabs, `gh` for the GitHub features), without blocking the rest.
  - [x] Paths wrap at path separators, never mid-word. Every text goes through `t()` in Swedish and English; the tabs work with the keyboard and say which one is selected.
- **Notes:**
  - **Where.** `src/renderer/SettingsView.jsx`, `TOOL_IDS` in `src/main/tools.js` (today `aidlc`, `claude`, `shell`).
  - **Plan.** Ultra-express, own branch after PR #31 (US-0506) merges, since Settings carries US-0506's notification settings.
- **Dependencies:** US-0405, US-0506

**US-0411: Pipeline stages as LCARS cards** ✅ Released in v0.2.5 (intent `261115-pipeline-cards`, ultra-express)
- As a **developer following a workflow**, in order to **read where the work is at a glance**, I would like to **see each pipeline stage as an LCARS card, with the current one lit**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-15 with an LCARS reference screen (a row of ship cards): "I like the framing on these cards and I think we can use something similar when we display cards on for example the pipeline".
- **Acceptance Criteria:**
  - [x] Each stage is a card: a thin outline with one rounded corner at the top right and a lighter bar segment on its top edge; a header strip with the stage name aligned right; a dark body; a footer strip with a short code (agent or duration) and a segmented level bar.
  - [x] The level bar shows progress the records give: units approved out of all units for a per-unit stage, otherwise done or not. No number is made up.
  - [x] The current stage's card is filled blue like a selected card; done cards are grey outlines; skipped ones are muted; a mismatch or failure shows in orange. *A stage waiting for approval is filled coral instead of blue, so "needs you" keeps its colour (decided in Requirements Analysis).*
  - [x] The current card glows; Reduced gives a static glow, Off none, as the animations setting does everywhere.
  - [x] Clicking a card still opens its files, as today; cost, mismatch and status keep their titles and texts through `t()`.
- **Notes:**
  - **Where.** `src/renderer/Pipeline.jsx` (`stage-block` today), with the shared card style from US-0410.
  - The reference image is not stored in the repository (third-party artwork); this story describes the card instead.
- **Dependencies:** US-0410

**US-0412: Pipeline cards with more LCARS feeling and motion** ✅ Released in v0.3.1
- As a **developer following a workflow**, in order to **feel the pipeline is a living console**, I would like to **the stage cards from US-0411 to look and move more like LCARS**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** After US-0411 (2026-11-15): "I was hoping for more LCARS feeling and animations. But let's add that to the next time we iterate over this story."
- **Acceptance Criteria:**
  - [x] The cards have more LCARS character than US-0411's first version (details to settle when the story starts, for example bolder header strips, elbows or segment blocks).
  - [x] Purposeful animations on the cards, for example a power-up when the pipeline opens, a sweep when a stage changes state, a flash when a stage completes (the leftover from US-0402).
  - [x] Reduced gives static effects and Off no motion, as the animations setting does everywhere; nothing flashes more than 3 times per second; only transform, opacity, `filter` and `box-shadow` animate.
- **Notes:**
  - **Built (2026-11-26).** Each card has an LCARS elbow with its number in the top block; cards power up in order when the view opens or shows another intent; a status change sweeps the card, a stage that becomes done flashes twice in 800 ms, and newly approved units grow into the level bar. All only with animations on Full.
  - **Where.** `src/renderer/Pipeline.jsx`, the `stage-card` rules in `src/renderer/theme.css`.
- **Dependencies:** US-0411

**US-0413: Update the app from a public release without the GitHub CLI** ✅ Released in v0.2.7
- As a **user of the open-source app**, in order to **get updates without installing and signing in to `gh`**, I would like to **have the app check and download its updates straight from the public GitHub release**.
- **Epic:** EPIC-04
- **Priority:** High
- **Complexity:** Medium
- **Background:** Reported 2026-11-15: an update to v0.2.5 failed to download on a second machine. The repository is to be made public and the app open source ("we will make it an open repo and open source the app"), so the release can be read without `gh`.
- **Acceptance Criteria:**
  - [x] The check reads the latest release from GitHub's public API over HTTPS (`api.github.com/repos/tochman/aidlc-dash/releases/latest`), with no token and no `gh`. Drafts and prereleases are still ignored.
  - [x] The download fetches this machine's asset and `SHA256SUMS.txt` from the release's own download URLs, follows GitHub's redirect, and shows progress against the asset's size.
  - [x] The checksum is verified as today; a mismatch deletes the file and says so. Only `tochman/aidlc-dash` release assets with a known name are fetched (US-0407 NFR3).
  - [x] A download that fails says why: no connection, a timeout, a full disk, an HTTP status or a checksum mismatch. A partial file is removed.
  - [x] GitHub's rate limit for unauthenticated calls is respected: at most one automatic check a day, as today, and a 403/429 says "try again later" instead of failing silently.
  - [x] `gh` is no longer needed for updates; Settings › Tools says it is used for the GitHub features and as a fallback when the public release cannot be reached.
  - [x] Every text goes through `t()` in Swedish and English.
- **Notes:**
  - **Where.** `src/main/updater.js`; Node's own `fetch` (Electron 45), no new dependency.
  - Depends on the repository being public (US-1101); until then the current `gh` path stays.
- **Dependencies:** US-0407, US-1101

---

**US-0414: One LCARS tooltip across the app** ✅ Released in v0.2.8
- As a **developer using the app**, in order to **read the details behind a figure, a button or a label the same way everywhere**, I would like **every tooltip in the app to look and behave like the one on the token detail view's split bars**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-16: "I love the tooltip on the agent progress page. we want to use the across the board in the application." The tooltip meant is `.token-detail-row-tip` in the token detail view (US-0208): a coral 2 px border, the LCARS corner (`border-radius: 2px 12px 2px 2px`), the app's background, tabular figures, shown on hover and on keyboard focus. Elsewhere the app shows tooltips in other ways: about 39 native `title=` attributes across `App.jsx`, `IntentList.jsx`, `IntentDetail.jsx`, `Pipeline.jsx`, `CostPanel.jsx`, `CostTab.jsx`, `FeaturesView.jsx`, `ConfigEdit.jsx`, `ProjectSettingsView.jsx`, `ArtifactReader.jsx`, `ResumeButton.jsx`, `TerminalPanel.jsx`, `Lcars.jsx` and `editor/EditorPanel.jsx`, and the visx chart tooltip (`.token-detail-tooltip`) in `TokenDetail.jsx`.
- **Acceptance Criteria:**
  - [x] **Given** any element in the app that shows a tooltip, **when** I hover over it or reach it by keyboard, **then** the tooltip has the same look as the split-bar tooltip.
  - [x] There is one shared tooltip (a component or a CSS class, whichever is smaller) that every place uses; no place keeps its own tooltip style.
  - [x] Native `title=` tooltips on interactive elements are replaced; an element that needs a name for screen readers keeps one (`aria-label` or `aria-describedby`).
  - [x] A tooltip stays inside the window: near an edge it opens to the side that has room.
  - [x] Tooltip texts go through `t()` in Swedish and English.
  - [x] A test checks that the shared tooltip opens on focus as well as on hover.
- **Notes:** Start with a list of every place that shows a tooltip today. The chart tooltip on "Tokens over time" (US-0024) should use the same style.
- **Built (2026-11-16, express intent `261116-shared-tooltip`):** one `Tooltip` component (`src/renderer/Tooltip.jsx`) rendered through a portal with the `.lcars-tip` look, placed by `tooltipPlacement.js` (flips above, shifts to stay 4 px inside the window). All 31 native `title=` tooltips are gone (the scan found 31, not about 39: 8 hits were captions and headings), and `noNativeTitle.test.jsx` keeps them out. Plain-text tooltips are focusable; tooltips on parts of a button stay hover-only and the button shows their combined text on focus; Resume uses `aria-disabled` so its reason shows. The split-bar row tip uses the component and the chart tooltip takes the same look. Exceptions: `StatusBadge` inside a row button is hover-only, and intent rows missing on disk stay natively disabled. Placement near the window edges, hover feel and stacking over dialogs are checked by hand in the built app.
- **Dependencies:** US-0208

**US-0415: Collapse the list column so the main view gets the room** ✅ Released in v0.2.13
- As a **developer looking at an intent's pipeline or a feature's detail**, in order to **see the whole graph or document without it being cut off**, I would like **to fold away the list column (intents, features and the other views' lists) and bring it back with one click**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Small
- **Background:** Asked for 2026-11-20 with a screenshot of the Intents view: the intents list takes about a third of the width, and the Unit graph beside it is cut off on the right (`u10-speckit-agent-…`, `u4-framework-…`).
- **Acceptance Criteria:**
  - [x] **Given** a view with a list column (Intents, Features and the other views that have one), **then** an LCARS toggle at the list's edge folds it to a narrow strip, and the main view takes the freed width.
  - [x] **Given** a folded list, **then** the same toggle, or a click on the strip, brings it back with its search, filters, sort and selection as they were.
  - [x] The folded or open state is kept per view across restarts.
  - [x] The toggle works from the keyboard, has an `aria-expanded` state and an accessible name, and carries a `data-testid`.
  - [x] It follows the LCARS look; the motion respects reduced motion.
  - [x] Every text goes through `t()` in `sv.json` and `en.json`.
- **Notes:** One shared toggle for every list column, not one per view.
- **Dependencies:** US-0414

---

**US-0416: Settings › Tools is one clear, grouped LCARS view** ✅ Released in v0.2.14
- As a **developer checking that my tools are set up**, in order to **see at a glance what is found, what is missing and what needs updating**, I would like **Settings › Tools grouped by purpose, with one row per tool, its state as a chip, and its actions in one place**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-22 with a screenshot: "rather messy and not very intuitive". The view is a grid of same-size cards of uneven height with large empty areas. AI-DLC shows up three times (the AI-DLC CLI card, the AI-DLC Program card with "Newer: v2.11.4", and AI-DLC in this project with long file lists that run off the bottom). Long paths wrap over three lines. Every card repeats "Found automatically" and "Choose…". Bitbucket's username and app-password form sits among tool paths. A missing tool (GitLab CLI) looks like the others apart from small orange text. Built in `src/renderer/SettingsView.jsx` (`Tools`) and `src/renderer/AidlcUpdate.jsx`.
- **Acceptance Criteria:**
  - [x] The view is grouped by purpose, each group an LCARS section: AI-DLC (the CLI, its update and this project's AI-DLC files together, once), Coding agents (Claude Code, opencode, …), Git hosts (GitHub CLI, GitLab CLI, Bitbucket sign-in), System (shell).
  - [x] Each tool is one compact row: name, version, a state chip (found, missing, update available, chosen by hand), and its actions (Choose…, Update) at the row's end; the path shows shortened, in full on hover and copyable.
  - [x] A missing or outdated tool stands out by its chip and colour, with what it is needed for and what to do in one line.
  - [x] Long lists (the project's changed AI-DLC files) are folded to a count, open on request, and never push the rest of the view out of sight.
  - [x] Bitbucket's sign-in sits in the Git hosts group as its own row with a Sign in action, not as an always-open form.
  - [x] Everything the view does today keeps working (choose a path, rescan, update AI-DLC, update the project files, save Bitbucket credentials).
  - [x] It follows the LCARS interface and works at narrow widths; every text goes through `t()` in `sv.json` and `en.json`; rows and actions carry `data-testid`s.
- **Notes:** A redesign of one view, so it runs on the `express` plan (or `visual-express` with a mockup first). Not a fix: no behaviour changes. Builds on US-0035 (tool lookup) and US-0504 (AI-DLC update); the wait notice there is US-0041.
- **Dependencies:** US-0504, US-0035, US-0041, US-0417

---

**US-0417: A richer LCARS language across the app: nested frames, quiet colour, dense readouts** ✅ Released in v0.2.14
- As a **developer who lives in the console**, in order to **read state at a glance and enjoy the look**, I would like **the app's LCARS look taken further, after the two reference screens the person gave, as shared pieces every view uses**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Large
- **Background:** Asked for 2026-11-22 with two reference screens (`~/Desktop/Screenshot 2026-11-13 at 11.32.07.png` and `11.32.22.png`, plus a close-up of the diagonal frame sent the same day): "analyze them carefully and compare to our designs. We can do better." Our palette already matches them (`--slate-*`, `--steel*`, `--coral*` in `src/renderer/theme.css`); the gap is composition. Compared with our views (Intents, the intent head, Settings › Tools, Configuration):
  - **Frames:** the references nest two or three elbow frames inside each other (a thick outer frame, a thinner inner one with its own rounded inner corner, a hairline frame), with bars broken into segments by small gaps and notches. Ours use one elbow per view, and Settings › Tools uses boxed, bordered cards, which the references never do: content floats on black inside the frames.
  - **Diagonal frames (added 2026-11-22 with a third screenshot):** an elbow can turn at 45° instead of a quarter circle: the thick bar runs diagonally from the side arm up to the top bar, with rounded joints where it bends, and a hairline follows it on both sides (outside and inside) at a constant distance. Under it sit square nav blocks, each with a thin coloured strip at its left edge, and the last one closed by a coral bar. The frame's corner holds an outlined tag (a name in a hairline box) beside a small cluster of dots, with a smaller "BUILD …" readout under it. The content area behind has a faint blueprint grid with small `+` marks at the crossings. Ours have only round elbows, no parallel hairlines and a plain black content area.
  - **Titles at frame breaks:** section titles sit in a gap of the frame line ("ZONE OPTIMIZATION • J.138" in the bottom bar, the ship name in the top bar), tall, condensed, steel blue. Ours sit above the content or in a corner.
  - **Colour discipline:** greys and slate for structure, steel blue for live values, white for the key number, coral/red only for alert and a selected item. Ours use amber (`--amber`) widely (the app block, sort and filter toggles, the parked pill, wait notices), so it no longer signals anything.
  - **State strips:** each tile has a thin coloured strip on top that carries its state (grey, white, coral); a selected card gets a bright outline and a filled icon. Ours change the whole block's fill.
  - **Dense readouts:** tables of numbers with tabular figures, a tiny coloured square as legend, three levels of brightness; sliders with tick scales; segmented bar meters; dot strips. Ours show label/value pairs with much empty space, and few scales.
  - **Two control shapes:** rounded pills are actions (Settings, Auto-idle, Red alert); square blocks are navigation and readouts. Ours mix them (square "Choose…" actions, pill Resume, square Park).
  - **Texture:** stacks of hairlines, code numbers ("70-678") on arm blocks, small dot and notch marks fill the margins with meaning-light detail. Ours have a few hairlines.
- **Acceptance Criteria:**
  - [x] A mockup of the views (Intents with the intent head, Features › Epics, Settings › Tools, Configuration, Cost, Activity) and the About and Update dialogs in the new language is approved by the person before code.
  - [x] Shared pieces in `theme.css` and `Lcars.jsx`: a nested frame (outer, inner and hairline, segmented bars, a title set in a frame break), a tile with a state strip, a readout table (tabular figures, legend squares, three brightness levels), a scale slider/meter and a segmented meter.
  - [x] The nested frame also comes in a diagonal form: a 45° elbow with rounded joints, hairlines running parallel outside and inside it, and an outlined tag with a dot cluster in its corner; views use round and diagonal elbows on purpose: the diagonal frame marks the data sub-views (Cost, Velocity and the like, at app level and in an intent's tabs), the round frame stays for the main views, as the person suggested on 2026-11-22; the mockup confirms which views get which.
  - [x] Nav blocks can carry a thin state strip at their left edge. No grid or `+` marks behind content: content sits on plain black (decided 2026-11-22).
  - [x] Containment rules, written in the theme and obeyed everywhere (asked 2026-11-22: "elements do not break the design of parent elements"): a child never extends past its parent's outline (a segment takes its bar's thickness, a block its column's width); no local bulges, a bar has one thickness along its length; elements are separated by the standard gaps, never overlap or touch a frame line, hairline or curve; an elbow's radii follow the thickness of the bars it joins; text stays inside its own element; one spacing scale and one set of bar thicknesses.
  - [x] Readouts never look like controls: a read-only meter or scale has no knob, thumb or handle and no hover or pointer change; knobs, thumbs and pills are only for things that can be changed (asked 2026-11-22).
  - [x] One colour rule, written down in the theme: structure grey/slate, live values steel, key value white, coral/red for alert and selection only; amber is kept for one meaning (the person's attention) or dropped.
  - [x] One shape rule: actions are pills, navigation and readouts are square blocks; every view follows it.
  - [x] No boxed cards with borders remain; panels sit inside frames.
  - [x] The three mocked views are rebuilt with the shared pieces; other views pick them up as they are touched.
  - [x] Contrast stays at WCAG AA for text; motion respects reduced motion; works at narrow widths.
  - [x] Navigation stays as it is: the same left arm, blocks and order, the same views, tabs and lists in the same places. Only the look changes (asked 2026-11-22: "making the LCARS look and feel better, not redesigning the whole app"); the one structural change in v0.2.14 is US-0416's grouping inside Settings › Tools.
  - [x] The list-column drawer (US-0415) works on every list column: Intents, Activity, Features › Epics, Features › Releases and the Editor's file tree. It takes the new look: the toggle is the last element of the list's heading row (no extra column) and a slim LCARS strip when folded (count and vertical label), without amber; folding and opening animate smoothly (width, frame and content together, no jump in the main view) and switch instantly under reduced motion.
  - [x] Hide terminal / Show terminal moves to the last segment of a thin bar along the window's foot, in the lower-right corner, styled like Full screen in the top bar so the two sit as a pair (asked 2026-11-22); the terminal's elbow keeps the mark.
  - [x] The token detail view (`src/renderer/TokenDetail.jsx`) is renamed "Activity" ("Aktivitet" in Swedish): its title, the intent head's button that opens it, and their `t()` keys in `en.json` and `sv.json` (asked 2026-11-22). It is a data sub-view in the diagonal frame; its chart drops the amber band for a steel or slate tone with legend squares.
  - [x] Settings gets a way out: a "‹ Back to <view>" pill on its title bar, and Esc, return to the view and project shown before Settings opened (asked 2026-11-22). The app's name and mark have one home that obeys the containment rules (the mark alone in the top-left elbow, the name as the label of the arm's foot block), with no duplicate watermark.
  - [x] Every view enters with one shared, reusable sequence, after the Activity mockup (asked 2026-11-22): the frame slides in, the elbow band wipes, bars draw out, blocks slide in in turn, content rises, charts and meters grow from their baseline. It runs on entering a view only, stays well under a second, never blocks clicks, and is off under reduced motion.
  - [x] The About dialog (`AboutDialog.jsx`) is redesigned in the new language, and the app update (check for updates, update available, downloading, ready to restart, error) becomes one LCARS dialog, opened by "Check for updates" and when an update is found (asked 2026-11-22).
  - [x] Built in our own app's terms only: no ships, insignia, names or other franchise artwork from the references.
- **Notes:** Runs on the `visual-express` plan (mockup first). Built before US-0416 in v0.2.14, so Settings › Tools is redesigned once, with these pieces; US-0412 (pipeline cards) uses them later.
- **Dependencies:** US-0414, US-0415


**US-0418: Pulse: see every working agent and every file it touches, live, in one circle** ✅ Released in v0.3.3
- As a **developer watching my agents work**, in order to **see at a glance who is working in the project and what they read, write and delete**, I would like **a live Pulse view where every working agent and every file it touches appears on a circle, with a pulse from agent to file for every access**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Large
- **Background:** Asked for 2026-11-27, inspired by [pretty-events](https://github.com/MoulikRT/pretty-events) (MIT): a canvas that draws an event stream as a ring of segments with rays and arcs, plus small readout panels under it. Decided the same day: Pulse is its own view on the app's left arm, for the whole project (every intent and every free session), so it does not crowd the Activity view, which is already full of data and stays per intent. Two observers feed it, since neither sees everything alone: the hook observer (the activity stream from US-0214 and US-0030, which knows the agent and sees reads, but today drops the tool's file path), and a file observer (`chokidar`, already used by `src/main/watcher.js`), which sees every create, change and delete, including a shell `rm` and the person's own edits, but not reads and not who made them.
- **Acceptance Criteria:**
  - [x] A Pulse block on the app's left arm opens the view; it shows a live dot while any agent works.
  - [x] **Given** running sessions, **then** the main chat and each dispatched agent hold a segment of the ring, grouped by intent or free session, appearing when they start and fading when they stop.
  - [x] Hook observer: **given** a Read, Write, Edit or MultiEdit call (Claude Code) or its opencode match, **then** the adapter keeps the project-relative file path, and the file appears as a mark with a pulse from the agent, coloured by action (read steel, write white, delete coral, after US-0417's colour rule).
  - [x] File observer: **given** a file is created, changed or deleted in the project (not `.git`, `node_modules` or ignored files), **then** it pulses too; it is credited to the agent whose shell command was running at that moment, otherwise to an "Unattributed" segment. A change the hook observer already showed is not shown twice.
  - [x] Only project-relative paths are kept, never file content, prompt text or other tool input; a test feeds the agent-event fixtures through and asserts this.
  - [x] Hovering a file or agent shows its name and last actions; clicking a file opens it in the editor (US-1001).
  - [x] Under the ring, small LCARS readouts: the latest actions, actions per agent, and reads/writes/deletes over time.
  - [x] Stays smooth with 20 agents and 500 files (files grouped by folder past a limit); drawn on a canvas with no new dependency; under reduced motion it shows a still frame.
  - [x] Every text through `t()` in Swedish and English, in the LCARS look, built in our own terms (no copy of pretty-events' look or code).
- **Notes:** Decided 2026-11-27: the file observer runs only while an agent is running or an intent or Spec Kit flow is active, to spare the disk. Replay of a past session can follow US-1505. Free sessions show once EPIC-15 lands; before that, sessions without an intent show as "Main".
- **Dependencies:** US-0214, US-0030, US-0417


**US-0419: Astrometrics, second pass: an LCARS instrument view** ✅ Done, for v0.3.31
- As a **developer watching my agents work**, in order to **read activity as part of the console and understand an idle project without losing my way out**, I would like **Astrometrics to present the activity ring as a dimensional LCARS instrument, show its empty state clearly, and keep Back in reach**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Asked for 2026-11-27, right after v0.3.3. The first Pulse pass put Back at the bottom of the left arm, below the fifteen-minute bars. With the terminal open at 1280 px that block sits behind the terminal panel, so the only way out is Esc. The body is also a large empty black field, so the ring floats instead of reading as an instrument. Reviewed on the built app at 1280 and 1600 px.
- **Acceptance Criteria:**
  - [x] The view is named **Astrometrics** in English and **Astrometrik** in Swedish, including its navigation entry and title; internal `pulse` identifiers remain stable.
  - [x] Back is a pill in the LCARS frame's title bar, clear of the elbow and hairline, and stays visible with the terminal open or closed; Esc still goes back.
  - [x] The frame tag carries live/idle state and agent count; the arm keeps rate, files and busiest readouts.
  - [x] The fifteen-minute bars sit in a footer strip under the canvas with a reads/writes/deletes legend, above the terminal.
  - [x] The canvas draws a faint LCARS scope behind the ring: concentric range rings, a crosshair and corner brackets in the theme's steel.
  - [x] The ring is projected into a shallow ellipse with subtle shadow depth; names and agent labels remain readable and correctly hit-tested.
  - [x] Dragging within the ring tilts its canvas view in bounded horizontal and vertical directions; the chosen orientation remains on release, while a click without a drag still opens a file.
  - [x] The ring sits higher in the stage to reduce the top gap; labels, hover targets and the footer remain aligned and unobscured.
  - [x] File names on the ring are one step larger and brighter, and still cut to the band.
  - [x] With no recorded activity, the empty ring remains visible behind a centered LCARS standby panel; the previous “no agent touched a file in the last 15 minutes” empty view is corrected.
  - [x] Hover callouts have balanced top and bottom padding.
  - [x] The stage keeps the largest size that fits above the terminal, with the footer counted and terminal appearance/opening observed after mount.
  - [x] In the release list, the planned v0.3.31 entry appears immediately above the v0.3.3 release.
  - [x] Under reduced motion the scope is a still frame like the ring; no new dependency.
  - [x] Every text goes through `t()` in Swedish and English, in the LCARS look.
  - [x] Build screenshots at 1280 px and 1600 px, with the terminal hidden, show both populated and empty states and are reviewed before release.
- **Notes:** A second pass on US-0418, not a redesign of the event ring: the vendor drawing, observers and store stay as they are. The requested decorative arches were rejected and removed from scope. All view criteria are implemented and verified; terminal-hidden screenshots at 1280 px and 1600 px were reviewed for populated and empty states, including two tilt directions. The v0.3.31 plan is in the release list. Remaining: local `.dmg` hand check, release PR, and tag.
- **Dependencies:** US-0418
