# Design System Mapping — US-0412 LCARS pipeline cards

All in `src/renderer/theme.css` and `src/renderer/Pipeline.jsx`. No new colour tokens and no new dependency.

## Reused

| Part | Existing piece | How it is used |
|---|---|---|
| Card frame | `.lcars-card` (side bar, head, foot in `--card-tone`, rounded elbow corners) | the elbow is its side bar widened from 14 px to 36 px on `.stage-card` |
| State colours | `.stage.is-current`, `.status-awaiting-approval`, `.status-done`, `.is-muted`, `.is-mismatch`, `.is-failed` rules | unchanged colours; done and skipped also outline the elbow |
| Tokens | `--steel`, `--coral`, `--coral-soft`, `--steel-deep`, `--slate-2`, `--slate-4`, `--on-light`, `--steel-a55` | fills, outlines, the sweep band |
| Live glow | `.is-breathing`, `.is-attn` and their static Reduced/Off rules (lines ~2041–2042) | unchanged |
| Motion switch | `:root[data-motion='full' \| 'reduced' \| 'off']` and the global `animation: none` / `transition: none` rules | new effects are written under `:root[data-motion='full']` only |
| Level bar | `.stage-level`, `.stage-level-seg.is-lit` | a new `is-new` segment class for the fill |

## New (small)

| Piece | Kind | Notes |
|---|---|---|
| `.stage-num` | element in the elbow's top block | holds "03" or "—" |
| `stage-power` | keyframes, `opacity` + `transform` | delay from a `--i` custom property set per card |
| `stage-sweep` | keyframes on `.stage-card.is-swept::after`, `transform` | band is a `linear-gradient` of `--steel-a55` |
| `stage-flash` | keyframes on `.stage-card.is-flashing`, `filter` | 2 peaks in 800 ms |
| `stage-fill` | keyframes on `.stage-level-seg.is-new`, `transform` | origin left |

Base styles keep every card visible (`opacity: 1`, no transform), so Reduced and Off, where the global rules remove animations, show the final look at once (US4.1).
