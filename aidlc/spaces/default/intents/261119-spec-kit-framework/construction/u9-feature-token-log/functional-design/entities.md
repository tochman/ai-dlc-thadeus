# Entities — u9-feature-token-log (US-1409)

Sources: `unit-of-work.md` (U9), `unit-of-work-story-map.md` (US5.1 → U9), `stories.md` (US5.1, AC5.1.1–AC5.1.3),
`requirements.md` (FR9.1–FR9.3), `contract-summary.md` (C8 token log, C5 feature reader). `components.md` is not part
of this workflow; the existing token code (`tokenReadings.js`, `tokenHistory.js`) stands in as the domain design.

```yaml
entities:
  - name: TokenBucket
    description: One token log file for a Spec Kit project; a feature's bucket or the project-wide bucket (C8).
    attributes:
      - { name: key, type: string, required: true, unique: true, constraints: "'speckit-<feature-dir>' or 'speckit-project'; matches ^[\\w.-]+$, no '..'" }
      - { name: kind, type: enum, required: true, allowed: [feature, project] }
      - { name: featureDir, type: string, required: false, constraints: "the folder name under specs/; absent for kind project" }
      - { name: readings, type: list<Reading>, required: true, default: [], constraints: "oldest first, at most 2000 (MAX_READINGS)" }
    storage: ".thadeus/tokens/<key>.json, a JSON array in the per-intent reading shape (FR9.3)"
    relationships:
      - { to: Reading, cardinality: "1..*", direction: owns }
  - name: Reading
    description: A cumulative total for one bucket at one moment; the same shape as the per-intent log.
    attributes:
      - { name: at, type: epoch-ms, required: true, constraints: "time of the turn end that produced it; increasing within a bucket" }
      - { name: input, type: int, required: true, min: 0 }
      - { name: output, type: int, required: true, min: 0 }
      - { name: cacheWrite5m, type: int, required: true, min: 0 }
      - { name: cacheWrite1h, type: int, required: true, min: 0 }
      - { name: cacheRead, type: int, required: true, min: 0 }
      - { name: usd, type: number, required: true, min: 0, constraints: "priced calls only (BR4.1)" }
  - name: TurnUsage
    description: The tokens one agent turn added, before they are credited. Not stored.
    attributes:
      - { name: harness, type: enum, required: true, allowed: [claude, opencode] }
      - { name: sessionKey, type: string, required: true, constraints: "transcript path (claude) or session id (opencode)" }
      - { name: calls, type: list<Call>, required: true, constraints: "one per message id, only those not counted before" }
      - { name: endedAt, type: epoch-ms, required: true }
  - name: Call
    description: One model call's usage.
    attributes:
      - { name: messageId, type: string, required: true }
      - { name: model, type: string, required: false }
      - { name: input, type: int, min: 0 }
      - { name: output, type: int, min: 0 }
      - { name: cacheWrite5m, type: int, min: 0 }
      - { name: cacheWrite1h, type: int, min: 0 }
      - { name: cacheRead, type: int, min: 0 }
  - name: SessionCursor
    description: What has already been counted per session, so a call is credited once. Machine-local, kept in the app's user data, never in the project.
    attributes:
      - { name: sessionKey, type: string, required: true, unique: true }
      - { name: counted, type: map<messageId, Call>, required: true, constraints: "the last counted usage per message id" }
    relationships:
      - { to: TurnUsage, cardinality: "1..*", direction: filters }
```

Summary: a Spec Kit project has one `TokenBucket` per feature that ever used tokens, plus the project-wide bucket.
Each bucket holds cumulative `Reading`s. A `TurnUsage` is computed per agent turn from the session's new `Call`s and
credited to one bucket; the `SessionCursor` remembers what each session has already counted.
