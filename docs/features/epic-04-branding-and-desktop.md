# EPIC-04: Branding & Desktop Integration

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Auctum AIDLC Control should look and behave like a proper Auctum desktop app wherever it shows up: in the Dock, the application menu, the window switcher, the installer and the Linux launcher. EPIC-01 added the name, splash screen and in-app logo. This epic covers the parts of the operating system that still show Electron defaults.

**Stories:** US-0401

**Status (2026-11-13):** 📋 Planned.

---

## User Stories

**US-0401: Auctum app icon on macOS and Linux** 📋 Planned
- As a **user at Auctum**, in order to **recognise the app at a glance**, I would like to **the Auctum mark as the app icon everywhere the operating system shows it**.
- **Epic:** EPIC-04
- **Priority:** Medium
- **Complexity:** Low
- **Acceptance Criteria:**
  - [ ] The icon is generated from the new geometric mark (`visinv/public/auctum.svg`, the same paths as `src/renderer/AuctumMark.jsx`), not the older variants in `public/logos/`. It is centred on a background that works in light and dark Docks, and the design is checked with the user before release.
  - [ ] macOS: an `icon.icns` in `build/` with all required sizes. Dock, Finder, the app switcher and the `.dmg` window show the Auctum icon, and electron-builder no longer warns "default Electron icon is used".
  - [ ] Linux: PNG icons (16–512 px) in `build/icons/`, used by the `.deb`'s `.desktop` entry, so the application menu and window list show the Auctum icon
  - [ ] In development (`npm run dev`) the Dock icon is also Auctum (`app.dock.setIcon` on macOS)
  - [ ] The icon sources and the command that generates them are committed, so the icon can be regenerated
  - [ ] Verified on an installed release on macOS and on Linux
- **Dependencies:** US-0109, US-0110
