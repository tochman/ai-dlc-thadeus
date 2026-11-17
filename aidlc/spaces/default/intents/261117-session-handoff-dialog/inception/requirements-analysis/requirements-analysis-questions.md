# Requirements Analysis Questions: US-0213 + US-0026

Both stories are written in detail (`docs/features/epic-02-cost-and-models.md`, `docs/features/epic-00-fixes.md`). These questions cover only what the stories leave open or where they disagree.

## Q1. [Product owner] Which command starts the work again in a fresh session?

US-0213 says Fresh session sends `/clear`, then `/aidlc`. US-0026 says `/clear`, then `/aidlc --resume`. Both carry on with the active workflow, so one form would do for both dialogs.

A. Both send `/aidlc --resume`
B. Both send bare `/aidlc`
C. Keep them as the stories say: `/aidlc` from the US-0213 dialog, `/aidlc --resume` from the US-0026 page
X. Other (please specify)

[Answer]: A

## Q2. [Product owner] How do the two dialogs relate at a new session?

At a new session US-0026 offers "/clear" and "/clear + /aidlc --resume". US-0213 offers Compact, Fresh session and Not now at a stage end, a gate or a large context.

A. One handoff page for both: at a new session it shows only "/clear" and "/clear + resume" (no Compact, since the context is still small); at the three US-0213 moments it shows Compact, Fresh session and Not now
B. Two separate pages, built separately
X. Other (please specify)

[Answer]: A

## Q3. [Product owner] A stage completes and AI-DLC then waits at its gate. One dialog or two?

These two moments usually come seconds apart, at the same stage boundary.

A. One dialog per stage boundary: the gate one wins (it says the gate is shown again in the new session); a stage completion with no gate after it gets its own
B. One dialog for each moment, even when both fire at the same boundary
X. Other (please specify)

[Answer]: A

## Q4. [Developer] How does the app tell that you are typing in the agent tab?

A command is sent only when you are not typing. The app sees the keys sent to the terminal, not what is on the prompt line.

A. Typing means a key went to that agent tab in the last 5 seconds, or since the agent last stopped, whichever is later; any key, including Enter, counts
B. Typing means a key went to that tab in the last 5 seconds, nothing more
C. Never send while the agent tab has focus; send once focus has left it
X. Other (please specify)

[Answer]: A

## Q5. [Developer] How does the app know AI-DLC is waiting at a gate?

A. From the intent's files: the active intent's state file shows a stage awaiting approval (`[?]`), confirmed by `STAGE_AWAITING_APPROVAL` as the latest gate event in the audit. Works for every harness
B. From the US-0506 dialog channel: an approval question is waiting there
C. Both: the files decide, the channel only adds timing
X. Other (please specify)

[Answer]: C

## Q6. [Product owner] What does "what one turn costs at that size" show?

A. An estimate: the context size times the session model's cache-read price from the US-0211 price table, labelled as an API-price estimate, with the tokens beside it; "price missing" when the model has no rate
B. Tokens only, no money
X. Other (please specify)

[Answer]: A ("both tokens and money")
