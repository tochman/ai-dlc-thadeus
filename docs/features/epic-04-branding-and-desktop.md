# EPIC-04: Branding & Desktop Integration

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Auctum AIDLC Control should look and behave like a proper Auctum desktop app wherever it shows up: in the Dock, the application menu, the window switcher, the installer and the Linux launcher. EPIC-01 added the name, splash screen and in-app logo. This epic covers the parts of the operating system that still show Electron defaults.

**Stories:** US-0401

**Status (2026-11-13):** 🚧 Built, not released (v0.1.1).

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
