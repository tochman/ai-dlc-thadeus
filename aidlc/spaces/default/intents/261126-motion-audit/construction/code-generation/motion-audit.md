# US-0050 Motion Audit

What moves today, per view, and the decision for each gap: **add** or **leave still**. Motion comes only from shared classes in `theme.css`; Reduced gives static, Off none. Pipeline stage cards (and their replay on each tab switch) are US-0412.

## Today, in short

- The entrance (`.is-entering .lcars-e-*`, 300 ms, 25 ms stagger) reaches every `lcars-e-*` element inside `app-main` on a view change. Nearly all such elements are the shared primitives (frames, elbows, headings, readout tables, meters, tiles).
- Not moving on entry: intent list rows, Timeline, Cost/Velocity/Files tab bodies, GitHub (Refresh, Machines), Config sections, all Spec Kit views.
- Tab switches inside a view are instant everywhere except Settings (remounts) and Features (Epics/Releases re-enters).
- Folds are instant except the drawer and the Features story reveal (220 ms).
- Live changes: only new Timeline rows (sweep 400 ms) and running/busy pulses.

## Decisions

| # | Where | Gap | Decision | Shared motion |
|---|---|---|---|---|
| 1 | Intent list | rows appear | **add**: rows rise on entry, stagger capped at 12 | `lcars-e-rise` |
| 2 | Intent detail tabs (Cost, Velocity, Timeline, Units, Comments, Files) | content swaps instantly | **add**: tab content fades and slides in, 200 ms | new `lcars-tab-in` |
| 3 | Inner switches: Velocity Week/Month, Activity Diagram/Table, Config Settings/Plans, Agent dialog pages | instant | **add**: same as 2 | `lcars-tab-in` |
| 4 | Arm sections: Config sections, GitHub sections | only the arm glows | **add**: section body as 2 | `lcars-tab-in` |
| 5 | GitHub (Refresh, Machines) | nothing enters | **add**: headings and rows join the entrance | `lcars-e-rise` |
| 6 | Spec Kit: features list, progress, feature detail, quick commands | nothing enters (frame once) | **add**: list rows block, parts and flow steps rise; selecting a feature as 2 | `lcars-e-block`, `lcars-e-rise`, `lcars-tab-in` |
| 7 | Folds: intent request, Cost Show/Hide, Timeline event fields, Comments resolved, Refresh panel, plan list, editor folders | instant | **add**: the Features story reveal, made shared | `lcars-reveal` (from `features-story-reveal`) |
| 8 | Live change: intent row status, intent list and feature counts, Spec Kit task done, story status | none | **add**: the changed element glows once, 600 ms, only when its value changes | new `lcars-changed` |
| 9 | Hover on arm blocks, pills, tiles, chips | instant filter | **add**: 150 ms filter transition, as `.lcars-block` | transition |
| 10 | Raw dialogs open (Docs, Profile switch, Add harness, Hooks preview, message popup) | instant | **add**: fade in on open | `@starting-style` opacity |
| 11 | Update dialog "checking" breathe | no static stand-in under Reduced | **add**: static ring under Reduced/Off | existing stand-in rule |
| 12 | Header bar and arm on view change | never enter | **leave still**: persistent chrome; it draws once at start | — |
| 13 | Timeline rows on entry | none | **leave still**: 2,000 virtualized rows; new rows already sweep | — |
| 14 | Dialog close, loading text | instant | **leave still**: closing a native dialog cannot animate without delaying focus; loading is brief | — |
| 15 | Editor tabs, terminal tabs | instant | **leave still**: work surfaces, motion distracts while typing | — |
| 16 | Pipeline cards, stage files fold, Show skipped | — | **US-0412** | — |

## Rules every addition keeps

- Rows already shown never replay: entry motion runs only under `is-entering`; `lcars-changed` keys on the value, not the render.
- Only transform, opacity, filter and box-shadow animate; nothing flashes more than 3 times a second; no animation delays a click or moves focus.
- 60 fps with 25 intents and 2,000 events: stagger is capped and Timeline gets no entry motion.

## Size

Items 1-11 touch about 20 components and add 3 shared classes. That is near the edge of a fix: the story moves to EPIC-04 if you want more than this list.
