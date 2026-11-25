# Questions: change the plan of an intent that has started (US-0509)

The story in `docs/features/epic-05-workflow-control.md` settles most of this. These are the choices it leaves open, after reading what AI-DLC 2.11.3 does.

## Q1. [Product] The approval of a ready-made plan

The story says that AI-DLC's own approval of the new plan stays with the person in the agent tab. That holds for a tailored plan (`/aidlc compose "<task>"`): AI-DLC proposes and asks approve, edit or reject. A ready-made plan (`/aidlc --scope <plan>`) has no such question: AI-DLC switches at once when the line is sent, and says how to switch back when that restores the old plan.

A. Offer both. The app types the line without sending it, and says before that a ready-made plan is switched at once, so sending the line is the approval. The criterion is reworded to say this.
B. Offer only the tailored plan, which has AI-DLC's approval.
X. Other (please specify)

[Answer]: A

## Q2. [Product] What the person sees before choosing a ready-made plan

The story asks for the current plan and the stages already done. The app can also work out what the chosen plan would change, from the plan's stages and the intent's state.

A. For the chosen plan: the stages it adds, the ones it drops, and the done ones that stay. A stage the plan runs but the work has already passed is shown as not run.
B. Only the plan's depth and number of stages, as in the Plans view.
X. Other (please specify)

[Answer]: A

## Q3. [Product] When "Change plan" waits, for the active intent

Resume waits whenever an agent session is open with the active intent in flight, even a quiet one. With that rule a plan could only be changed with the agent tab closed.

A. It waits, with its reason, only while the agent works or a question is waiting for an answer. In an open, idle session the line can be typed.
B. The same rule as Resume.
X. Other (please specify)

[Answer]: A

## Q4. [Product] An intent in flight that is not the active one

AI-DLC changes the plan of the active intent only.

A. Offered there too: the app first submits the switch (`/aidlc intent <folder>`) and then types the line unsent, as Resume does, and it waits by Resume's rule because it switches the work.
B. Offered for the active intent only. The others show why.
X. Other (please specify)

[Answer]: A

## Q5. [Product] A parked intent

AI-DLC changes the plan of parked work without unparking it when a ready-made plan is named. I have not seen it state what a tailored plan does there.

A. Unavailable, with the reason that the intent must be resumed first.
B. A ready-made plan only: the plan changes and the work stays parked.
X. Other (please specify)

[Answer]: A
