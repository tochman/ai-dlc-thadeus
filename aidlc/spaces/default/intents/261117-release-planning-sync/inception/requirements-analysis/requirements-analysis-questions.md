# Requirements Analysis Questions: US-0606 + US-0607

Stories: US-0606 (release planning changes are committed on their own branch) and US-0607 (release planning is kept locally and pushed to GitHub when there is time), `docs/features/epic-06-feature-docs.md`.

## Q1. [Product] Where do planning commits go?
US-0606 commits to a branch `docs/release-vX.Y.Z` and offers a push and pull request by hand. US-0607 changes that: planning commits go straight to `main` and the app pushes them itself. The two cannot both hold.

A. Straight to `main`: commit in a temporary worktree from `origin/main`, rebase when `main` moved, push to `origin/main` (US-0607's proposal; US-0606's branch and PR offer are dropped)
B. Branch `docs/release-vX.Y.Z` with a pull request opened by hand, as US-0606 says; the app pushes the branch itself at the interval
C. Branch `docs/release-vX.Y.Z`, pushed by the app, and the app opens the pull request itself
X. Other (please specify)

[Answer]: B

## Q2. [Product] Removing a story from a release
US-0606 says added stories go into the slice table of `docs/releases/X.Y.Z.md`. It says nothing about a removed story.

A. Remove its row from the slice table too, in the same commit
B. Leave the plan file as it is; only the markers change
X. Other (please specify)

[Answer]: B

## Q3. [Product] Where the push interval is set
US-0607 says the person sets the interval (default 10 minutes).

A. Per project, in the project's settings under Configuration
B. Once for the whole app, in the app settings
C. No setting for now: a fixed 10 minutes
X. Other (please specify)

[Answer]: B

## Q4. [Developer] The checked-out working tree
The commit is made in a temporary worktree, so the checkout is never switched. The question is whether the checkout's files also get the change.

A. Yes, as today: the app writes the files in the checkout (so the view shows the change at once) and commits the same change in the temporary worktree. Once the checkout pulls `main`, the files match and are clean
B. No: only the temporary worktree gets the change; the checkout sees it after its next pull
X. Other (please specify)

[Answer]: A

## Q5. [Developer] When the app checks for lost planning actions
US-0607 re-applies an action that is neither on `origin/main` nor in the working tree (for example after `git checkout -- <files>`).

A. When the app starts, when the release list opens, and at each push interval
B. Only at each push interval
C. Only when the app starts
X. Other (please specify)

[Answer]: A

## Q6. [Developer] A project with no `origin` remote
A. Commit locally, keep the record, and the release list says there is no remote to push to
B. Commit nothing; write the files in the checkout as today and keep only the local record
X. Other (please specify)

[Answer]: A

## Q7. [Delivery] One pull request or two
The team rule is one squash-merged pull request per story. This piece of work holds two stories, and US-0607 builds on US-0606.

A. One branch and one pull request for both, with both story numbers in the subject: `feat(US-0606, US-0607): …`
B. Two pull requests in order, US-0606 first
X. Other (please specify)

[Answer]: A

## Q8. [Product] When an action leaves the local record (follow-up to Q1)
US-0607 says an action leaves the record once its commit is on `origin/main`. With the branch-and-pull-request answer to Q1, the commit first reaches `origin/docs/release-vX.Y.Z`, and `main` only after the pull request is merged.

A. When its commit is on `origin/docs/release-vX.Y.Z` (pushed is safe enough)
B. Only when its change is on `origin/main` (the pull request is merged); until then the release list keeps showing it
X. Other (please specify)

[Answer]: X. on origin/main unless it is not protected. otherwise in a doc branch (defined in project settings by the user per project)

## Q9. [Developer] Files left changed in a checkout on `main` (follow-up to Q1 and Q4)
With Q4 A the app also writes the change into the checkout. When the checkout is on `main`, those files stay changed and uncommitted there until the pull request is merged and pulled: the same state that lost work in US-0607's background.

A. Keep it: the local record protects the change, and the files become clean when `main` is pulled after the merge
B. When the checkout is on `main`, do not write its files; it sees the change after the merge and pull
X. Other (please specify)

[Answer]: X. we need to figure out what the best course of action is. we do not want to disturb the current intent, but we need to ake sure the plan is coitted as soon as possible. Retain in emory first and coit at the first possible tie. if gh cli is configured, that should be erged (without cli for speed). the sae goes if we use Features.d and create new user stories or epics.

## Q10. [Product] "If gh cli is configured, that should be merged" (follow-up to Q9)
When `main` is protected, the planning commit goes to the docs branch you name per project, through a pull request. Your answer says it should then be merged.

A. When `gh` is set up, the app opens the pull request and merges it itself (squash), with no shell tab; without `gh`, it pushes the branch and the release list offers the pull request by hand
B. When `gh` is set up, the app opens the pull request with auto-merge on, so GitHub merges it once its checks pass
X. Other (please specify)

[Answer]: A

## Q11. [Developer] The checkout while a story is in progress (follow-up to Q4 and Q9)
"We do not want to disturb the current intent": the checkout is often on a story branch with work of its own.

A. Write the checkout's files only when it is on `main` or on the docs branch; on any other branch leave it untouched (the change lives in the local record and the temporary worktree, and arrives with the next pull)
B. Never write the checkout; the release list shows pending changes from the local record until they arrive with a pull
X. Other (please specify)

[Answer]: A

## Q12. [Product] New stories and epics in the feature docs (follow-up to Q9)
"The same goes if we use FEATURES.md and create new user stories or epics." Today the app does not write new stories or epics itself; the agent writes them in the checkout.

A. In this piece of work: any change to `docs/FEATURES.md`, `docs/features/` or `docs/releases/` that the app makes goes through the same record, commit and push; changes written by an agent are a new story for later
B. In this piece of work: also pick up changes to those files that an agent wrote in the checkout, and commit them the same way
C. Not in this piece of work: add it as a new story in EPIC-06 for later
X. Other (please specify)

[Answer]: B

## Q13. [Product] Agent-written doc changes on a story branch (Q12 B against Q11 A and the team rule)
The team rule says feature docs travel with their story's pull request: on `feat/US-XXXX` the agent sets that story to 🚧 and ✅ in the same files. Picking those changes up and committing them to `main` would take them out of the story's pull request, and Q11 says a story branch is left undisturbed.

A. Pick up agent-written changes to the feature docs only when the checkout is on `main` (or the docs branch); on a story branch they stay with the story
B. Pick them up on every branch, except the lines of the story the branch is named for
X. Other (please specify)

[Answer]: A. The person added: the mechanism must not disrupt the current work, and must not wait for it to finish either.
