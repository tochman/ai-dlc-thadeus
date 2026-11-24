# NFR Requirements Questions — u9-feature-token-log (US-1409)

Settled already, so not asked here: no network, no secrets, no new dependency; paths stay inside the project and
`~/.claude/projects` (NFR3); Claude Code and opencode only (NFR6); test first and 80% coverage (NFR8). The design
review raised two points that need your call before the code plan.

## Q1. [Product owner] Calls from before the app first sees a session

The first time the app sees a session (a resumed session, one started before any feature existed, or one whose
"already counted" record was lost), the transcript already holds earlier calls. The design now credits all of them
to the feature active at that moment, which can put unrelated tokens on that feature.

A. Credit the earlier calls to the project-wide bucket; only calls from the first seen turn on go to the feature (nothing dropped, nothing put on the wrong feature)
B. Skip the earlier calls; log only from the first seen turn on (may undercount)
C. Keep the design: credit the whole session so far to the active feature
X. Other (please specify)

[Answer]: A

## Q2. [Developer] opencode token counts

Today the app's opencode plugin sends only a context total and the model, not the message id or the output and
cache-write counts the log needs.

A. Extend the app's opencode plugin in this story to send the message id and full token counts, so both harnesses log (FR9.1, NFR6)
B. Log Claude Code only in this story; opencode readings come in a later story (the gap is written in the feature docs)
X. Other (please specify)

[Answer]: A
