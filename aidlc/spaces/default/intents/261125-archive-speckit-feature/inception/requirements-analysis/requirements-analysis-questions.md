# Questions: archive and unarchive a Spec Kit feature (US-1411)

The story in `docs/features/epic-14-spec-kit.md` already settles most of this. These are the choices it leaves open.

## Q1. [Product] Where "Show archived" sits

The list leaves archived features out and says how many there are. The intent list (US-0513) has "Archived (N)" in its status filter, but the Spec Kit feature list has no filter at all.

A. A line at the foot of the list, "3 archived · Show archived", which unfolds them below the others.
B. A filter above the list like the intent list's, with "All features" and "Archived (3)". It shows only when something is archived.
X. Other (please specify)

[Answer]: B

## Q2. [Product] When an archived feature becomes active and then is not active any more

The story says that an archived feature that becomes active (named in `.specify/feature.json`) shows again. It does not say what happens when another feature then becomes active.

A. The mark is only ignored while the feature is active: it hides again afterwards. The app writes nothing by itself.
B. The mark is removed when the app sees the feature become active, so it stays in the list until you archive it again.
X. Other (please specify)

[Answer]: B

## Q3. [Product] The token log and the cost of an archived feature

The story says that an archived feature's token log still opens and that its cost still counts in the totals. But the app has no view of a Spec Kit project's tokens or cost today: US-1409 only writes the log, in `.thadeus/tokens/speckit-<feature>.json`.

A. Archiving leaves the log alone, readings are still added to it, and it opens in the editor as today. A view of it is a story of its own, and the criterion is reworded to say this.
B. This story also adds the feature's token log and cost to its detail, with a project total. The story grows from Small to Medium.
X. Other (please specify)

[Answer]: A

## Q4. [Development] How the marks are kept under `.thadeus/`

The app already commits and pushes what it writes under `.thadeus/` to `main`, so the mark reaches every clone without new code. But that sync compares whole files: when two clones have changed the same file, it stops with a conflict.

A. One small file per archived feature, `.thadeus/archived/<feature folder>.json`. Unarchive deletes it. Two clones that archive different features never conflict.
B. One file, `.thadeus/archived.json`, with a list. Simpler to read, as the story words it ("the app's own file"), but two clones that archive at the same time conflict.
X. Other (please specify)

[Answer]: X. "it should probably push to the planning branch that we set in settings Main can be used as a fallback but it ight be a protected branch anbd we will have probles then... worth investigating" (how the marks are kept is asked again in Q5, the branch in Q6)

## Q5. [Development] How the marks are kept (Q4 again)

The answer to Q4 was about where they are pushed, which is the same for both layouts and is Q6.

A. One small file per archived feature, `.thadeus/archived/<feature folder>.json`. Unarchive deletes it.
B. One file, `.thadeus/archived.json`, with a list.
X. Other (please specify)

[Answer]: A

## Q6. [Development] Where the app pushes its own files

Investigated after Q4. The marks use the app's one push path, shared with the token logs and the release planning: `main` when it is not protected, else the planning branch from the settings with a pull request the app merges (decided 2026-11-17, US-0607). Your concern is right in one case. The app asks GitHub only about classic branch protection, and tells a refused push by the words "protected branch". A repository whose ruleset requires pull requests is therefore taken as unprotected, the refusal is not recognised, and nothing the app writes is ever pushed. This repository has such a ruleset, but it only forbids deleting and force pushing `main`, so it is not affected today.

A. A story of its own in EPIC-00, for v0.3.1: the app recognises rulesets and goes to the planning branch. The order stays as it is: `main` first, the planning branch when `main` takes no pushes.
B. As A, and the order changes too: always the planning branch from the settings, `main` only as a fallback. This reverses the decision of 2026-11-17 for release planning, token logs and every other file the app pushes.
C. Fix the ruleset case inside this story.
X. Other (please specify)

[Answer]: A
