# User Stories Assessment — US-0412 LCARS pipeline cards

## Decision

Execute.

## Rationale

US-0412 is a user-facing change: what the person sees and feels on the Pipeline view. It holds four separate effects plus a new card shape, and each one has its own trigger and its own behaviour under the animations setting. Splitting it into small stories gives each effect its own testable acceptance criteria, so Code Generation can build and test them one by one.

## Factors considered

- Project type: brownfield, renderer only (`src/renderer/Pipeline.jsx`, `src/renderer/theme.css`).
- User-facing scope: the stage cards on the Pipeline view; nothing else (requirements, Out of scope).
- Complexity signals: change detection between renders (sweep, flash, fill), and three animation levels.

## Story plan

- Personas: 2 (the developer following a workflow; the person who has turned motion down).
- Breakdown: by effect, one vertical slice each, grouped as card shape (US1), power-up (US2), state-change effects (US3) and the animations setting (US4).
- Priority: MoSCoW from the story's acceptance criteria; the level bar fill is Should Have, as the story names it nowhere.
- Questions: none. The approved mockups and Requirements Analysis (Q1, Q2) already settle every choice this stage would ask about.
