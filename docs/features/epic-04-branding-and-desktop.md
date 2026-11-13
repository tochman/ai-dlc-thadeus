# EPIC-04: Branding, Look & Desktop Integration

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Auctum AIDLC Control should look and behave like a proper Auctum desktop app wherever it shows up: in the Dock, the application menu, the window switcher, the installer and the Linux launcher. Inside the app it should feel like a living bridge console. EPIC-01 added the name, splash screen, in-app logo and the restrained LCARS theme. This epic covers the parts of the operating system that still show Electron defaults, and the motion and light that make the theme come alive without hurting readability.

**Stories:** US-0401, US-0402, US-0403

**Status (2026-11-13):** US-0401 🚧 Built and released in v0.1.1, awaiting verification on an installed release. US-0402 📋 Planned. US-0403 📋 Planned.

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

**US-0403: LCARS design refresh — palette, frames and data elements** 📋 Planned
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
  - [ ] **Given** the new tokens, **then** every colour in `theme.css` comes from them. No hard-coded colours are left in components, and the old amber/lavender LCARS palette is replaced, except the Auctum mark and the primary action.
  - [ ] **Given** the project view, **then** the sidebar and the content area sit inside nested elbow frames, and the terminal panel is framed by the bottom elbow, consistent at window widths from 1100 px to 2560 px.
  - [ ] **Given** the intent list, the pipeline and the cost panel, **then** they use labelled blocks, the dot progress indicator, tick rails and data-readout columns as described above.
  - [ ] Coral is used only for errors, failed stages and "waiting for your approval". Blue marks only the active or current item.
  - [ ] All text meets WCAG AA contrast against its background, and no state is shown by colour alone (each also has a label, shape or icon).
  - [ ] Decorative elements (stripes, numeric decoration) are `aria-hidden` and never contain invented data that could be taken for real. Every number shown is a real value from the project.
  - [ ] No Star Trek assets, ships, names, logos or sounds. The look is inspired by the style only.
  - [ ] Existing tests stay green, and existing `data-testid`s are kept.
- **Notes:** Built together with US-0402 (glow and motion), since both touch `theme.css` and the frame components. Before code, a static mock-up of the project view is reviewed and approved.
- **Dependencies:** US-0103, US-0104, US-0105, US-0402
