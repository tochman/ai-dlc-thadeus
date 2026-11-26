# Mockups — US-0412 LCARS pipeline cards

Sources: `ideation/rough-mockups/wireframes.md`, `user-flow.md`; `inception/user-stories/stories.md` (US1.1–US4.1); `inception/requirements-analysis/requirements.md`. Measurements are at a 1280 px window, 3 cards per row (about 340 px wide each).

## 1. The elbow card (US1.1)

```
 ___________________________________________________
/  03  |  REQUIREMENTS-ANALYSIS                      )  head row, 28px, cap on the right
|      |____________________________________________/
|      |  IN PROGRESS · CURRENT          opus · $0.42    body: status, flags, model, cost
|      |  ________________________________________
\______| | PRODUCT · 4M 12S            [#][#][ ]   )    foot row: agent, duration, level bar
 <-36->
```

- Elbow column 36 px wide, full card height, the outer corner rounded 22 px (as `.lcars-card` today), the inner corner where it meets the head row rounded 14 px.
- The number sits in the elbow's top block, right-aligned, 15 px, tabular figures. No number: "—".
- Head row: stage slug, upper case, right-aligned, ending in the round cap. Body starts with the status.
- Card height about 84 px (today 76 px). Long slugs (for example `infrastructure-design-validation`) wrap within the head row; nothing overflows (AC1.1.4).

## 2. The card in each state (US1.1 AC1.1.3)

| State | Elbow and strips | Body | Text |
|---|---|---|---|
| Current | steel fill | steel | dark (`--on-light`) |
| Needs you | coral fill | coral | dark |
| Done | 1 px grey outline (`--slate-4`), elbow drawn as outline too | transparent | muted |
| Not started | `--steel-deep` fill (today's default card) | dark | muted |
| Skipped | dashed 1 px `--slate-2`, no fill, elbow dashed | transparent | muted |
| Mismatch or failure | the state's own look plus a 2 px `--coral-soft` outline and the flag text | as state | as state |

```
current              needs you            done                 skipped
 ____________         ____________         ____________         _ _ _ _ _ _
/03|█████████)       /04|▓▓▓▓▓▓▓▓▓)       /02|        )        /05:        )
|  |█████████        |  |▓▓▓▓▓▓▓▓▓        |  |                 :  :
\__|█████████)       \__|▓▓▓▓▓▓▓▓▓)       \__|________)        \_ _ _ _ _ _)
 █ steel              ▓ coral              grey outline         dashed, muted
```

## 3. Motion (Full only)

```
power-up (US2.1)       t=0      40ms     80ms  ...  360ms     600ms
                       [01]     [01][02] [01][02][03]  ...    all in
                       each card: fades in and slides 12px in from the left, 240ms

sweep (US3.1)          [ ░▒▓█▓▒░ ---------------------> ]     one band, 600ms, once

flash (US3.2)          steel card -> bright -> normal -> bright -> settles to grey outline
                       0ms          200ms     400ms     600ms     800ms

level fill (US3.3)     [#][#][ ]  ->  [#][#][>]  ->  [#][#][#]    new segment grows from the left, 300ms
```

## 4. Reduced and Off (US4.1)

Same cards, same states, shown at once. Reduced keeps the static steel glow on the current card and the coral ring on a needs-you card. Off shows neither glow animation nor any transition.
