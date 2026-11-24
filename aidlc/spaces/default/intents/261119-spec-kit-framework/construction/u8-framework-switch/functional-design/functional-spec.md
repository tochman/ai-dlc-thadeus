# Functional Spec — u8-framework-switch

Implements US2.3 (US-1407) from `stories.md`: AC2.3.1–AC2.3.4, FR8.1–FR8.3 in `requirements.md`. Unit U8 in
`unit-of-work.md` and `unit-of-work-story-map.md`; contract C10 in `contract-summary.md`, built on C2 (the framework
file), C3 (Spec Kit setup) and C4 (the confirmed write of the first-open choice, `chooseFramework`). Kind: ui. Rules in
`rules.md` (BR8.1–BR8.6). `components.md` is not part of this workflow; U1, U2, U3 and U4 stand in as the domain design.

## Workflow W1: switch framework

1. In the project's Configuration, the person opens the Framework section (shown for both frameworks) and picks
   "Switch to <other>" (BR8.1).
2. The app calls `project:switchPreview(projectId, to)` and shows: setup runs or not, the views change, the old
   files stay (`keeps`), and the work in progress that is not carried over (BR8.2, BR8.3).
3. The person confirms or cancels. Cancel: nothing happens.
4. If `setupNeeded`, the existing setup runs: AI-DLC through the US-0503 setup flow, Spec Kit through `speckit:setup`
   with the project's harness. Its output shows as it does today. Failure or cancel: stop; file and views unchanged
   (BR8.4).
5. The app calls `project:switch(projectId, to)`. It re-checks the folder, writes `.thadeus/project.json` through U2
   and sends the C1 detection push before it returns (BR8.5, BR8.6).
6. The arm and views follow the new framework. The section now offers the switch back, through the same steps.

## States of the section

`idle` --(pick switch)--> `preview` --(cancel)--> `idle`
`preview` --(confirm, no setup)--> `writing` --(ok)--> `idle` (new framework) | --(error)--> `failed`
`preview` --(confirm, setup)--> `setup` --(ok)--> `writing`; `setup` --(fail or cancel)--> `failed`
`failed` --(close)--> `idle` (old framework, file unchanged)

## Edge cases

- The other framework's folder appears or disappears between preview and confirm: step 5 re-checks and refuses with
  `setupNeeded`, the section shows the preview again.
- A project with no `.thadeus/project.json` yet (detected framework): the switch writes the file for the first time.
- A Spec Kit features read or an intents read that fails: the preview lists what it could read and says one list
  could not be read.

## Derived views

Rules summary (source `rules.md`): BR8.1 only to the other framework; BR8.2 preview of setup, views and kept files;
BR8.3 work in progress named; BR8.4 setup first, failure changes nothing; BR8.5 one atomic write, nothing deleted;
BR8.6 views follow and switch back works the same way.

## Assumptions & Open Questions

- [assumption] One confirm in the preview covers both the setup and the write; the setup's own dialogs (the AI-DLC
  setup choices, the Spec Kit harness) still show as they do in first open.
