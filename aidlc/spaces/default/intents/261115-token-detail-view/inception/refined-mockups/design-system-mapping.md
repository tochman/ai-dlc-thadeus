# Design System Mapping: US-0208, detailed token view

| Element | Existing piece (`theme.css`, components) |
|---|---|
| Frame per chart | `.lcars-card` + `.lcars-card-head` (elbow, header bar) |
| Back, Diagram/Table, Tokens/$ | `.lcars-block--sm`; active `.lcars-block--active` (steel) |
| Title bar | `--font-head` (Antonio), uppercase, `letter-spacing: 0.06em` |
| Numbers | `--font-read`, `font-variant-numeric: tabular-nums`, `formatTokens` |
| LIVE dot | `.lcars-live-dot` (existing, follows motion) |
| Missing-data sentence | `.muted` paragraph inside the frame body |
| Tooltip | `--slate-2` block, `--text` figures, square corners, no border |
| Chart background | `--slate-1`; axis labels `--muted`; no grid lines, only the zero line in `--slate-3` |

## Series colours (every one also has a text label)

| Kind | Colour |
|---|---|
| Input | `--steel` (#4fa3d9) |
| Output | `--amber` (#ff9e40), the one warm series |
| Cache write 5 m | new `--steel-mid` (#2f6f9f) |
| Cache write 1 h | `--steel-light` (#a9d6f2) |
| Cache read | `--steel-deep` (#1f3b57) |
| Rate line | `--steel` with a soft glow |
| $ bars | `--steel` |
| Tooltip and marker | `--coral` (#ee6c56) outline |

Updated after the visual mockups (https://claude.ai/artifact/WrphyHBekrup5wdVzwi8Yt): mostly steel shades, with orange and coral as accents. Grid lines are `--steel-deep`, the baseline `--slate-3`, and the frame is `--slate-3` at 14 px.

- Stacks are separated by a 1px `--bg` gap, never an outline.
- visx draws plain SVG, so every fill comes from these CSS variables, through classes and not inline hex.
