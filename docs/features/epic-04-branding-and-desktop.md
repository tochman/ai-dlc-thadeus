# EPIC-04: Branding, Look & Desktop Integration

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Auctum AIDLC Control should look and behave like a proper Auctum desktop app wherever it shows up: in the Dock, the application menu, the window switcher, the installer and the Linux launcher. Inside the app it should feel like a living bridge console. EPIC-01 added the name, splash screen, in-app logo and the restrained LCARS theme. This epic covers the parts of the operating system that still show Electron defaults, and the motion and light that make the theme come alive without hurting readability.

**Stories:** US-0401, US-0402, US-0403, US-0404, US-0405, US-0406

**Status (2026-11-14):** ✅ US-0401 released in v0.1.1. ✅ US-0402, US-0403 and US-0404 released in v0.2.0. ✅ US-0406 done, merged to main (not released yet) (intent `261113-thadeus-name`). US-0405 📋 Planned.

---

## User Stories

**US-0401: Auctum app icon on macOS and Linux** ✅ Released in v0.1.1
- As a **user at Auctum**, in order to **recognise the app at a glance**, I would like to **the Auctum mark as the app icon everywhere the operating system shows it**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Low
- **Acceptance Criteria:**
  - [x] The icon is generated from the new geometric mark (`visinv/public/auctum.svg`, the same paths as `src/renderer/AuctumMark.jsx`), not the older variants in `public/logos/`. It is centred on a background that works in light and dark Docks (`build/icon.svg`: amber mark on a dark rounded square, macOS icon grid).
  - [x] The design is checked with the user before release.
  - [x] macOS: the `.icns` with all required sizes is derived by electron-builder from `build/icon.png` (1024×1024), so Dock, Finder, the app switcher and the `.dmg` window show the Auctum icon and electron-builder no longer warns "default Electron icon is used".
  - [x] Linux: the PNG sizes for the `.deb`'s `.desktop` entry are derived by electron-builder from `build/icon.png`, and the window gets the icon via `BrowserWindow` (`resources/icon.png`), so the application menu and window list show the Auctum icon
  - [x] In development (`npm run dev`) the Dock icon is also Auctum (`app.dock.setIcon` on macOS)
  - [x] The icon sources (`build/icon.svg`, `build/icon.png`) and the command that generates them (`npm run icon`, `scripts/make-icon.cjs`) are committed, so the icon can be regenerated
  - [ ] Verified on an installed release on macOS and on Linux
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

**US-0405: Settings view with native file pickers** 📋 Planned (after v0.2.0)
- As a **developer who runs the console in full screen**, in order to **change the app's settings and point it at the right tools without leaving the bridge view or hunting for config files**, I would like to **a full settings view inside the app, where paths are chosen with the operating system's own file dialogs**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Medium
- **Background:** Today the app finds `aidlc` and `claude` through the login shell's PATH, and settings are spread over small dialogs (Animationer in US-0402, Projektinställningar in EPIC-06). In full screen (US-0404) a separate dialog window feels out of place, and there is nowhere to fix a tool the app cannot find.
- **Acceptance Criteria:**
  - [ ] **A settings view** opens from "Inställningar" in the left arm, from the menu ("Inställningar…", `Cmd/Ctrl+,`) and works in full screen. It is a view in the content frame, in the LCARS style, not a separate window. It has sections as labelled blocks: **Verktyg**, **Utseende**, **Projekt**, **Om**.
  - [ ] **Verktyg (tools):**
    - path to the **AI-DLC CLI** (`aidlc`), the **Claude Code CLI** (`claude`) and the **shell** for the terminal tabs
    - each one shows what was found automatically (via the login shell's PATH) and its version (`aidlc --version`, `claude --version`, run with fixed arguments and no shell)
    - "Välj…" opens the **native file dialog** (`dialog.showOpenDialog`, files only) to point at another binary, and "Återställ" goes back to automatic
    - a chosen path is checked before it is saved: the file exists, is executable, and `--version` answers. Otherwise a short message explains why it was not saved.
    - all places that start `aidlc` or `claude` (setup, models, the terminal tabs) use the chosen path
  - [ ] **Utseende:** Animationer (Full / Dämpad / Av, from US-0402), Helskärm vid start (US-0404) and, once EPIC-07 is built, Språk.
  - [ ] **Projekt:**
    - the default folder for "Öppna projekt…", chosen with the native folder dialog
    - the list of recently opened projects, where entries can be removed
    - a link to each open project's Projektinställningar (EPIC-06)
  - [ ] **Om:** the app version, the AI-DLC version found, the Auctum symbol, and links to the repo and the feature docs.
  - [ ] Settings are saved in the app's own `settings.json`, validated by `sanitize()`. Nothing is written into any project. Paths are stored as absolute paths and never passed through a shell.
  - [ ] The existing small dialogs either move into this view or open it at the right section, so each setting has one home.
  - [ ] Keyboard and screen readers: every field has a label, file buttons have names ("Välj sökväg till aidlc"), and focus moves into the view when it opens.
- **Dependencies:** US-0402, US-0403, US-0404, EPIC-06

**US-0406: Name the application T.H.A.D.E.U.S.** ✅ Done, merged to main (not released yet) (intent `261113-thadeus-name`)
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
