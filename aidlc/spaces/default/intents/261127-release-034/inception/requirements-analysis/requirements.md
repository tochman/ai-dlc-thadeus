# Requirements Analysis — US-0906 Visual Plan Designer

## Intent Analysis

Build the first planned story in release v0.3.4: a visual plan designer that lets developers shape framework-supported plans without editing plan files by hand. This workflow covers US-0906 only; the other v0.3.4 stories remain separate work. [Q1] [scope]

## Sources

- Initial description: [desc] “Start working on release 0.3.4”
- Workflow-selected scope: [scope] `ultra-express`
- [Q1] The person selected US-0906, the first story in `docs/releases/0.3.4.md`.
- [Q2] The person confirmed the acceptance criteria in `docs/features/epic-09-aidlc-configuration.md` are to be used as written.
- Story requirements and context: `docs/features/epic-09-aidlc-configuration.md`, US-0906.
- Release membership and dependencies: `docs/releases/0.3.4.md`.
- Project practices: LCARS interface, Swedish and English text through `t()`, and the existing React application.

## Functional Requirements

### FR1 — Display plans visually

- **FR1.1** The designer shall display a plan's stages as nodes in pipeline order. Skipped stages shall be visibly distinguished as off. The plan's defaults shall appear in a side panel.
- **FR1.2** The designer shall show only plan structures supported by the project's selected framework; it shall not act as a general-purpose workflow builder.

### FR2 — Edit and validate plan steps

- **FR2.1** A developer shall be able to add, remove, toggle, and configure a stage using the canvas.
- **FR2.2** Before accepting an edit, the designer shall validate it against the selected framework's allowed plan structure. It shall refuse a disallowed edit and explain why.
- **FR2.3** For Spec Kit plans, the core flow shall remain a locked spine; developers may place, remove, and configure extensions and hooks around it.

### FR3 — Preview and save changes

- **FR3.1** Before applying a save, the designer shall show a preview of the proposed changes and shall not write them until the developer selects Apply.
- **FR3.2** AI-DLC plan changes shall be saved through the official `aidlc` CLI (`aidlc engine scope save`).
- **FR3.3** Spec Kit extensions and hooks shall be saved to `.specify/extensions.yml` only after preview and Apply.

### FR4 — Protect external edits

- **FR4.1** If a plan file changes outside the app, the designer shall reload the changed plan and shall not silently overwrite that change.

## Non-Functional Requirements

- **NFR1 — Accessibility and motion:** All designer functions shall be operable by keyboard and exposed to screen readers; reduced-motion preferences shall be respected.
- **NFR2 — Localization:** Every user-facing string shall use `t()` and have matching Swedish and English locale entries.
- **NFR3 — Interface consistency:** The designer shall follow the app's LCARS interface conventions.

## Constraints

- Deliver US-0906 as its own story workflow; the v0.3.4 release plan's other stories are not part of this intent.
- The AI-DLC adapter is the first framework adapter. The designer shall support both AI-DLC and Spec Kit as defined by US-0906.
- Preserve the project rule that the selected framework determines the available views; do not introduce a general plugin system.
- The plan editor must build on the existing React application and Plans view.
- The implementation may select a canvas dependency during design/build; US-0906 suggests React Flow (xyflow, MIT) but does not mandate it.

## Assumptions

- The accepted US-0906 acceptance criteria are the complete product scope for this story; detailed interaction choices can be resolved in design and implementation.
- Existing plan files remain the source of truth. The canvas is an editing surface and does not bypass the framework's validation or save mechanisms.

## Out of Scope

- US-0304 (Intent spans), US-1306 (AI share of delivered code), and US-1307 (Team insights), which are also listed in the v0.3.4 release plan.
- Composing a plan from a sentence or changing a running plan directly in the designer (US-0907, planned for v0.3.5).
- A general-purpose workflow builder or plugin system.

## Open Questions

- None.
