# Wireframes: US-0208, detailed token view

Low fidelity, LCARS throughout: solid bars, elbows and end caps, no hairline outlines (team UI rule). Answers: [Q1] C, [Q2] C, [Q3] chart library styled as LCARS, [Q4] A.

## Screen 1: Intent detail with the small token view (today, plus one affordance)

```
+=[ INTENT 261115-token-detail-view ]================================+
|  ( pipeline cards ... )                    | TOKENS            [>] |
|                                            | IN   ||||||....  1.2M |
|                                            | OUT  |||.......  180k |
|                                            | CW   ||........   90k |
|                                            | CR   ||||||||..  4.1M |
|                                            | ~~~~~/\~~~~/\/\~~~~~~ |
+--------------------------------------------+-----------------------+
```

- The whole small view is one button: "Open the token detail" (`role=button`, Enter or Space). The `[>]` end cap shows that it opens.
- Accessibility: stays inside the intent detail's `main`; keyboard entry is the small view itself.

## Screen 2: Token detail, replacing the intent's main panel [Q1]

```
+=[ < BACK ]=[ TOKENS · 261115-token-detail-view ]=====[ LIVE ● ]====+
| TOTAL 5.6M tokens · $12.40 · 1h 42m recorded                        |
+=[ TOKENS OVER TIME ]=====================[ DIAGRAM | TABLE ]=======+
|  stacked area per kind: input / output / cache write 5m / 1h / read |
|  ▁▂▃▅▆▇█  x: time from the stored readings [Q2]   legend with labels|
+=[ TOKEN RATE ]===========================[ DIAGRAM | TABLE ]=======+
|  stepped line, tokens per minute, same time axis                    |
+=[ BY STAGE ]=========+=[ BY AGENT ]==========+=[ BY MODEL ]=========+
| horizontal bars,     | horizontal bars,      | horizontal bars,     |
| pipeline order       | largest first         | largest first        |
| [DIAGRAM | TABLE]    | [DIAGRAM | TABLE]     | [DIAGRAM | TABLE]    |
+======================+=======================+======================+
```

- **Back** (and Esc) returns to Screen 1, with focus back on the small view.
- Each frame's header bar holds its own **Diagram | Table** switch [Q4]. The table shows the same numbers: rows by time, stage, agent or model, with columns per token kind and in dollars.
- Hover or focus on a point or bar shows a tooltip with the exact figures. Every series has a text label in the legend, never colour alone.
- **LIVE ●** shows while the intent runs, and the diagrams update from the cost refresh. A finished intent shows **RECORDED** and its stored history.
- Charts come from a chart library styled with the theme's LCARS colours, square corners, bold labels and no grid hairlines [Q3]. The library is chosen in Requirements.
- Accessibility: `h2` "Tokens" in `main`; each frame is a `section` with an `h3`. Keyboard entry is Back, then each frame's switch; a table is a real `<table>`.

## Screen 3: Missing data

```
+=[ TOKENS OVER TIME ]=====================[ DIAGRAM | TABLE ]=======+
|  No readings stored for this intent yet. They are kept from now on. |
+=====================================================================+
```

- A diagram without data says why in one sentence instead of drawing zero (story criterion). Examples: no stored readings (an intent finished before this story), or no ledger entry yet.
- Stage, agent and model splits still come from the ledger totals, so they show even without readings.

## Information architecture

- Intent detail → small token view → **Token detail** (in the main panel) → Back.
- Token detail: summary bar · Tokens over time · Token rate · By stage · By agent · By model; each with Diagram / Table.

## Open for Requirements

- Where the readings are stored [Q2 C]. Suggested: the app's own data folder, one file per project and intent, not committed. Also its size cap and how often a reading is taken.
- Which chart library to use (bundle size, SVG for themeable styling, accessible tooltips) [Q3].
