# Wireframes — LCARS pipeline cards (US-0412)

Sources: Initial description: US-0412 story text [desc]; answers Q1–Q3 [Q1] [Q2] [Q3]; current cards in `src/renderer/Pipeline.jsx` and the `stage-card` rules in `theme.css` (US-0411).

## 1. The card: elbow shape [Q1]

Today (US-0411):

```
+--------------------------------------------(
| requirements-analysis                        |   head strip, name
+----------------------------------------------+
| 03 · IN PROGRESS              opus · $0.42   |   body
+--------------------------------------------(
| product · 4m 12s                 [#][#][ ]   |   foot strip
+----------------------------------------------+
```

New: the head strip bends down the left edge as an LCARS elbow. The stage number sits in the elbow's corner block.

```
 ______________________________________________
/  03  |  REQUIREMENTS-ANALYSIS                 )   head strip, taller (28px), round end cap right
|      |_______________________________________/
|      |  IN PROGRESS                opus · $0.42   body: status, flags, model, cost
|      |
|      |  ____________________________________
\______| | PRODUCT · 4M 12S        [#][#][ ]  )     foot strip: agent, duration, level bar
```

- The elbow (left bar, about 36px wide) and the head strip are one shape in the card's state colour; the inner corner is rounded, as in the app's arm.
- The number ("03") moves from the body into the elbow's top block; the body line starts with the status.
- Colours by state stay as US-0411 set them: current steel fill, needs-you coral, done grey outline (the elbow drawn as an outline too), skipped dashed and muted, mismatch or failure soft coral outline and flag.
- Size: same grid (3 per row), the card keeps its width; height grows a little (about 84px instead of 76px).

Accessibility: no heading change (cards are buttons inside the phase's `h3`); the number stays in the button's text, so it is still read out; keyboard entry is unchanged (Tab to the card, Enter opens its files). Black text on steel and coral keeps AA as today.

## 2. Motion [Q2] [Q3]

Only with animations on **Full**. Only transform, opacity, `filter` and `box-shadow` animate.

| Effect | When | What you see | Length |
|---|---|---|---|
| Power-up | Every time the Pipeline view opens [Q3] | Cards light up one after another, left to right, row by row: each fades in and its elbow slides in from the left | ~40ms apart, all done within 600ms |
| Sweep | A stage changes state while you watch (not on open) | One band of light passes across that card once, left to right | 600ms, once |
| Flash | A stage becomes done | The card brightens twice, then settles into the grey done outline | 2 flashes over 800ms (2.5 a second, under 3) |
| Level bar fill | A unit in the stage is approved | The new lit segment grows from the left | 300ms |

```
power-up   t=0     t=120ms   t=240ms ...
           [■]     [■][■]    [■][■][■]
                             [■] ...

sweep      |░▒▓█▓▒░ →        |  one pass over the card

flash      done:  bright · normal · bright · settle (outline)
```

## 3. Reduced and Off

| Setting | Behaviour |
|---|---|
| Full | Everything above, plus today's breathing and coral pulse |
| Reduced | No movement: cards are shown at once, no sweep, no flash, no fill. Static effects stay: the current card's steel glow and the needs-you coral ring (as today). A stage that just became done gets the done outline directly. |
| Off | No motion and no transitions at all; the shape is the same. |

Nothing flashes more than 3 times a second at any setting.
