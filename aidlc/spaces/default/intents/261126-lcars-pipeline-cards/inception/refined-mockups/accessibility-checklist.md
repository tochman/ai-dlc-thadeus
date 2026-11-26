# Accessibility Checklist — US-0412 LCARS pipeline cards

Target: WCAG 2.1 AA, as the app's rule (requirements NFR2, NFR3).

| Check | How the design meets it | Story |
|---|---|---|
| [x] Status never by colour alone | the status word stays in each card's text; flags stay as text | US1.1 |
| [x] Contrast | dark text on steel and coral, muted text on the dark background, unchanged from US-0411 (AA) | US1.1 |
| [x] UI contrast 3:1 | the done outline (`--slate-4`) and the coral-soft flag outline are unchanged | US1.1 |
| [x] Keyboard | one native button per card; Tab, Enter and Space unchanged; focus outline unchanged | US1.1 |
| [x] Screen reader | button text holds the number and status; effects add no text and no live region | US1.1 |
| [x] No more than 3 flashes a second | the flash is 2 peaks in 800 ms (2.5 a second); the sweep is one pass | US3.2 |
| [x] Reduced motion | Reduced and Off stop every new effect; Off also stops transitions | US4.1 |
| [x] Focus never moved | no effect moves or steals focus | all |
| [x] Zoom | the head row wraps long slugs; at 200% zoom the grid's existing wrapping applies | US1.1 |

To check in Build and Test: the renderer tests for each motion level, and one look at a long slug at 1280 px.
