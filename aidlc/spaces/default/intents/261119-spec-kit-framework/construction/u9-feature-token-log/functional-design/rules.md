# Business Rules — u9-feature-token-log (US-1409)

Sources: `requirements.md` FR9.1–FR9.3, `stories.md` US5.1 (AC5.1.1–AC5.1.3), `unit-of-work.md` U9,
`unit-of-work-story-map.md`, `contract-summary.md` C5 and C8, answers Q1–Q3 in `functional-design-questions.md`.

```yaml
rules:
  - id: BR1.1
    statement: Readings are taken only in a project whose framework is Spec Kit; an AI-DLC project keeps its ledger-based per-intent readings unchanged.
    category: policy
    applies_to: TurnUsage
    trigger: an agent turn ends
    logic: IF the project's framework is not speckit THEN do nothing.
    violation: none (silent no-op)
    source: FR9.1
  - id: BR1.2
    statement: For Claude Code, a turn's usage is read from the transcript the Stop event names, one call per message id, only for calls the session cursor has not counted.
    category: calculation
    applies_to: TurnUsage, SessionCursor
    trigger: a Claude Code Stop event with a transcript path
    logic: IF the path is inside ~/.claude/projects THEN read its calls (last line of a message id wins) and keep those whose usage differs from the cursor's; the first event of a session counts the whole session so far.
    violation: a path outside ~/.claude/projects or an unreadable transcript is logged and the turn is skipped; the cursor is not moved, so the next turn counts it.
    source: FR9.1
  - id: BR1.3
    statement: For opencode, each usage event names one assistant message; it counts once per message id, and a re-sent message adds only its increase.
    category: calculation
    applies_to: TurnUsage, SessionCursor
    trigger: an opencode plugin usage event
    logic: IF the message id was counted THEN credit the difference to the stored usage ELSE credit the whole usage.
    violation: an event without tokens or message id is ignored.
    source: FR9.1
  - id: BR1.4
    statement: A turn's usage is credited to the feature active when the turn ends, also when the turn itself changed the active feature.
    category: policy
    applies_to: TokenBucket
    trigger: TurnUsage computed
    logic: read the active feature at turn end; credit the whole turn there.
    violation: none
    source: FR9.1, Q1
  - id: BR2.1
    statement: The bucket is the feature folder `.specify/feature.json` names, as the C5 feature reader resolves it; otherwise the project-wide bucket `speckit-project`.
    category: validation
    applies_to: TokenBucket
    trigger: crediting a turn
    logic: IF the reader returns an active feature folder that is listed under specs/ THEN key speckit-<folder> ELSE (no file, unreadable, missing folder, link) key speckit-project.
    violation: none; the reading is never dropped.
    source: FR9.2
  - id: BR2.2
    statement: No usage is lost to throttling; a reading less than 30 s after the bucket's last one replaces it with the new cumulative total.
    category: constraint
    applies_to: Reading
    trigger: appending a reading
    logic: new = last + turn; IF new.at - last.at < 30 s THEN replace last ELSE append; past 2000 readings thin the oldest half as the per-intent log does.
    violation: none
    source: FR9.2
  - id: BR3.1
    statement: Logs are written only as `.thadeus/tokens/speckit-<feature-dir>.json` or `.thadeus/tokens/speckit-project.json`, never in `.specify/` or `specs/`.
    category: constraint
    applies_to: TokenBucket
    trigger: writing a bucket
    logic: IF the key fails the name check (^[\w.-]+$, no '..') THEN use speckit-project; write atomically inside the project root, refusing a .thadeus that links outside it.
    violation: write refused and logged.
    source: FR9.3
  - id: BR3.2
    statement: A failed write is logged and the cursor is not advanced, so the next turn credits the usage again.
    category: policy
    applies_to: SessionCursor
    trigger: bucket write fails
    logic: advance the cursor only after the bucket file is written.
    violation: console error naming the bucket.
    source: FR9.2
  - id: BR4.1
    statement: Each call is priced per model and token kind from the app's price table; a call whose model has no price adds its tokens but no dollars.
    category: calculation
    applies_to: Reading
    trigger: building a reading
    logic: usd += sum(kind tokens x rate(model, kind)) / 1e6 for priced calls.
    violation: none
    source: FR9.1, Q2
```

| Rule | In short | Source |
|---|---|---|
| BR1.1 | Spec Kit projects only | FR9.1 |
| BR1.2 | Claude: transcript calls not yet counted | FR9.1 |
| BR1.3 | opencode: per message id, increase only | FR9.1 |
| BR1.4 | Credit the feature active at turn end | FR9.1, Q1 |
| BR2.1 | No valid active feature: project bucket | FR9.2 |
| BR2.2 | No loss to the 30 s throttle | FR9.2 |
| BR3.1 | Only `.thadeus/tokens/speckit-*.json` | FR9.3 |
| BR3.2 | Failed write: retry next turn | FR9.2 |
| BR4.1 | Dollars from the price table | FR9.1, Q2 |
