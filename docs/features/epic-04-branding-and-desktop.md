# EPIC-04: Branding, Look & Desktop Integration

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Auctum AIDLC Control should look and behave like a proper Auctum desktop app wherever it shows up: in the Dock, the application menu, the window switcher, the installer and the Linux launcher. Inside the app it should feel like a living bridge console. EPIC-01 added the name, splash screen, in-app logo and the restrained LCARS theme. This epic covers the parts of the operating system that still show Electron defaults, and the motion and light that make the theme come alive without hurting readability.

**Stories:** US-0401, US-0402

**Status (2026-11-13):** US-0401 🚧 Built and released in v0.1.1, awaiting verification on an installed release. US-0402 📋 Planned.

---

## User Stories

**US-0401: Auctum app icon on macOS and Linux** 🚧 Built, not released
- As a **user at Auctum**, in order to **recognise the app at a glance**, I would like to **the Auctum mark as the app icon everywhere the operating system shows it**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Low
- **Acceptance Criteria:**
  - [x] The icon is generated from the new geometric mark (`visinv/public/auctum.svg`, the same paths as `src/renderer/AuctumMark.jsx`), not the older variants in `public/logos/`. It is centred on a background that works in light and dark Docks (`build/icon.svg`: amber mark on a dark rounded square, macOS icon grid).
  - [ ] The design is checked with the user before release.
  - [x] macOS: the `.icns` with all required sizes is derived by electron-builder from `build/icon.png` (1024×1024), so Dock, Finder, the app switcher and the `.dmg` window show the Auctum icon and electron-builder no longer warns "default Electron icon is used".
  - [x] Linux: the PNG sizes for the `.deb`'s `.desktop` entry are derived by electron-builder from `build/icon.png`, and the window gets the icon via `BrowserWindow` (`resources/icon.png`), so the application menu and window list show the Auctum icon
  - [x] In development (`npm run dev`) the Dock icon is also Auctum (`app.dock.setIcon` on macOS)
  - [x] The icon sources (`build/icon.svg`, `build/icon.png`) and the command that generates them (`npm run icon`, `scripts/make-icon.cjs`) are committed, so the icon can be regenerated
  - [ ] Verified on an installed release on macOS and on Linux
- **Dependencies:** US-0109, US-0110

**US-0402: Living LCARS — glow and motion** 📋 Planned
- As a **nerdy developer at Auctum**, in order to **feel that I am sitting at a living bridge console while agents work**, I would like to **the LCARS elements to have a soft glow and purposeful animations that react to what is happening**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] **Glow:** LCARS elbows, panel bars and active buttons have a soft outer glow in their accent colour (amber, lavender, blue), stronger on hover and focus. Body text and tables never glow, and contrast stays at least WCAG AA (4.5:1).
  - [ ] **Live state:** an intent or stage that is in progress has a slow "breathing" glow on its marker. A stage that is waiting for approval pulses in amber, so it stands out as needing the person. The live indicator in the header gets a subtle scanning light.
  - [ ] **Transitions:** switching project tabs, intent and detail tabs (Pipeline, Tidslinje, Units, Filer, Kostnad) uses short slide/fade transitions (150–250 ms). Panels and elbows "power up" once when a project opens (a staggered reveal of at most 600 ms in total).
  - [ ] **Events:** a new audit event slides into the timeline with a brief light sweep in its category colour. A stage that completes gives a short confirmation flash on its pipeline row.
  - [ ] **Ambient detail (subtle):** LCARS bars can show small, slowly updating segment blocks or numbers as decoration, like on a ship console. They are never animated so fast or so brightly that they distract from content, and they can be turned off.
  - [ ] **Accessibility and comfort:**
    - With `prefers-reduced-motion`, all motion is off and the glow is static.
    - A setting "Animationer: Full / Dämpad / Av" (default Full) is remembered in the app's settings.
    - Nothing flashes more than 3 times per second.
  - [ ] **Performance:** animations use CSS transforms, opacity and `filter`/`box-shadow` only (no layout thrash). The app stays at 60 fps on an ordinary laptop with a project of 25 intents and 2 000 timeline events, and idle CPU does not rise noticeably from the ambient effects.
  - [ ] No Star Trek trademarks, sounds or copied assets: the effects are inspired by LCARS only (as in US-0109).
- **Dependencies:** US-0109, US-0103, US-0104, US-0107
