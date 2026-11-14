## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-11-14T15:07:51Z
**Iteration:** 2
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md > FR2.1, FR2.7, FR2.8, FR5.2 | The artifact has no pass/fail rule for telling an idle wait (the agent is asking in plain text) from a finished reply (the agent is done). FR2.7 turns a plain-text question into an idle wait. FR5.2 notifies on both under a separate setting, and FR2.8 shows the last reply in the same view. Every finished reply could open an answer field, or a real plain-text question could be shown as a quiet finished reply. QA cannot write a test for either case. | State which hook or plugin event produces each kind and what the dialog and notification do for each. Add a Given/When/Then for the plain-text question and one for a finished reply with no question. | Resolved (reviewer) |
| R-02 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md > FR4.1, FR4.4, NFR4 | The hooks are committed in the shared `.claude/settings.json` (Q3 B). The artifact does not say what command they run or where its script lives. If the script exists only on the installer's machine, a teammate without the app gets a failing hook, which breaks FR4.4 ("returns at once, blocks nothing"). If the script is committed, the artifact does not say where, or how the NFR4 100 ms limit holds when it is absent. | Add a requirement for the hook command: where its script lives, and what happens when the script or the app is missing (silent exit 0 and no output). Add an acceptance criterion for a checkout with the hook entry but no script and no app. | Resolved (reviewer) |
| R-03 | Major | aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md > FR1, FR3, FR4 (corner conditions) | Several corner conditions are not settled as a requirement, an assumption with a reason, or out of scope. (a) Two sessions or tabs raise events at the same moment, so the order and the notification behaviour are undefined. (b) Question text or a reply is very large, or contains characters that break the local message format. (c) `.claude/settings.json` is missing, is not valid JSON, or cannot be written, or AI-DLC rewrites it while the app installs. (d) The app restarts while a hook is waiting (NFR5 covers the hang, not what the person sees). (e) The location for the opencode plugin is unspecified. | Add a short corner-conditions list. For each case, say what the person sees or give a reason it is out of scope: event queue order, size limit and escaping, install failure on a missing, invalid or unwritable settings file, app restart with an open question, and the opencode plugin path. | Resolved (reviewer) |
| R-04 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md > NFR1, NFR2 | "Reference Mac" and "the acceptance suite" are not defined, so the 1 s latency and the 100% correctness figures cannot be reproduced. | Name the reference machine or measurement method. List the scenarios the acceptance suite covers (reordered options, batch, multi-select, label mismatch). | Resolved (reviewer) |
| R-05 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md > FR3.3 | "While a dialog is open, that session waits for the dialog" fits a question or permission prompt. For an idle wait or a finished reply nothing is held, so the sentence has no meaning there. | Limit the wording to questions and permission prompts. Say what closing an idle-wait dialog does. | Resolved (reviewer) |
| R-06 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md > Assumptions, Open questions | Five assumptions carry `[assumption]` tags, but the Q&A file records no confirmation of them. Two of them, how a hook returns an answer and how long a hook may wait, decide whether FR3.2 and FR3.3 can be built, and they sit only in the open questions. | Record the person's confirmation of the assumptions in the Q&A file, or turn them into questions. Say what the fallback is if the spike (the Claude Code hook test) shows a hook cannot return a question answer. | Resolved (reviewer) |
| R-07 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md > FR2.7, FR5.2 | The default for replies is "dialog and notification". Every finished agent turn then opens a modal dialog and sends a notification, which may be noisy during a long AI-DLC run. Whether that default fits the success goal "no interruption without need" is not argued. | Either state why the default is not "line only", or record it as an open question to confirm after first use. | New |
| R-08 | Minor | aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md > FR3.6, FR4.6, FR4.7, FR6, FR5 | The numbering is out of order (FR3.6 before FR3.4, FR4.6 and FR4.7 before FR4.5, FR6 before FR5). This makes traceability harder to read. | Renumber in reading order, or note that the IDs are stable and not sequential. | New |

> R-01 Reviewer note: FR1.1 now has a table naming one source event per kind for both harnesses. FR2.7 has Given/When/Then for a plain-text question and for a finished reply with no question, and FR5.2 states what each reply setting does.

> R-02 Reviewer note: FR4.6 fixes the hook command's behaviour: it checks the session value first and exits 0 with no output if it is absent, even when the script or app is missing. It has an AC for a checkout with the entry but no app and no script folder. Only the folder name is deferred to Functional Design, which is acceptable.

> R-03 Reviewer note: FR6.1 to FR6.4 and FR4.7 settle simultaneous events, size and special characters, app restart while a hook waits, and a tab that exits. FR4.7 settles a missing, invalid or unwritable `settings.json` and an AI-DLC rewrite after the preview. The opencode plugin path is deferred to Functional Design with the rules stated.

> R-04 Reviewer note: NFR1 names the machine and the timing log with 20 runs. NFR2 lists seven scenarios, each run against both harnesses.

> R-05 Reviewer note: FR3.3 is now limited to questions and permission prompts. It says that closing a reply dialog only dismisses it.

> R-06 Reviewer note: The Q&A file has the person's accepted assumption confirmation. FR3.6 states the fallback if a hook cannot return an answer or cannot wait.

### Summary

All six prior findings are fixed: the event model, the hook's safe behaviour, the corner conditions and the measurement method are now testable, and the assumptions are confirmed. Only two minor points remain, so engineering can start.
