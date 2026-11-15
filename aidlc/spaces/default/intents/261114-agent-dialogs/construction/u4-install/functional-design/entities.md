# Entities: u4-install

## Sources

- Unit: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work.md` (U4), `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work-story-map.md`.
- Story: US4.1 in `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md` (AC4.1.1–AC4.1.6).
- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (FR4.1–FR4.7, NFR4).
- Components: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/components.md` (HookInstaller owns HookInstallation), `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/decisions.md` (ADR-004, ADR-005).
- Contracts: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C4 `agentHooks.*`, C5, C6).
- Mockups: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/refined-mockups/mockups.md` (M7, M8).
- Integration points (the entries and plugin events this Unit installs): `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md`, `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/functional-spec.md`, `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/functional-spec.md`.
- Existing code: `src/main/fileWrite.js` (atomic write, `isEngineOwned`), `src/main/projectAccess.js` (`resolveInRoot`, `readJsonSafe`), `src/main/harness.js` (`detectHarnesses`).
- Answers: `functional-design-questions.md` Q1 `[Q1]` (A).

## Entity model

```yaml
entities:
  - name: HookInstallation
    description: >
      What the app knows about its own part in one project for one harness: which files it owns there,
      the status of each, and the harness status derived from them. Owned by HookInstaller; held in
      memory in main and recomputed from disk (BR7.17). Never persisted by the app.
    identifier: installationKey
    attributes:
      - name: installationKey
        type: string
        required: true
        unique: true
        constraints: "projectRoot + ':' + harness"
      - name: projectRoot
        type: path
        required: true
        constraints: "the real path returned by openRoot; every file path is relative to it"
      - name: harness
        type: enum
        required: true
        allowed: [claude, opencode]
      - name: files
        type: list<InstallFile>
        required: true
        constraints: "claude: exactly two (settingsEntries, script); opencode: exactly one (plugin) (BR7.2, BR7.3)"
      - name: status
        type: enum
        required: true
        allowed: [current, outOfDate, missing, editedByHand]
        constraints: "derived from files (BR7.5); never set directly"
      - name: used
        type: boolean
        required: true
        constraints: "true when the project has the harness's folder markers or an agent tab of that harness was opened in this app run (BR7.15)"
      - name: checkedAt
        type: timestamp
        required: true
        constraints: "ISO 8601 with offset; the last time the files were read"
      - name: previewDigest
        type: string
        required: false
        default: null
        constraints: "combined digest of every file's bytes (or 'absent') at the open preview; null when no preview is open"
    constraints:
      - "isCurrent (C5) is true exactly when status is current"
    relationships:
      - entity: InstallFile
        cardinality: one-to-many
        direction: "HookInstallation holds 1..2 InstallFile"
      - entity: InstallPreview
        cardinality: one-to-zero-or-one
        direction: "HookInstallation has at most one open InstallPreview"

  - name: InstallFile
    description: "One committed file the app owns all or part of, as read from disk at checkedAt."
    identifier: path
    attributes:
      - name: path
        type: path
        required: true
        allowed: [".claude/settings.json", ".thadeus/hooks/dialog.sh", ".opencode/plugins/thadeus-dialog.ts"]
        constraints: "root-relative, fixed; no other path is ever written (BR7.13)"
      - name: role
        type: enum
        required: true
        allowed: [settingsEntries, script, plugin]
        constraints: "settingsEntries: the app owns only its entries in a shared file; script and plugin: the app owns the whole file"
      - name: status
        type: enum
        required: true
        allowed: [current, outOfDate, missing, editedByHand]
        constraints: "settingsEntries: derived from entries (BR7.5); script and plugin: by content digest (BR7.4)"
      - name: digest
        type: string
        required: false
        default: null
        constraints: "digest of the exact bytes read; null when the file is absent"
      - name: reason
        type: string
        required: false
        default: null
        constraints: "one translated sentence when the file could not be read or parsed (BR7.12); status is then missing"
      - name: entries
        type: list<HookEntry>
        required: false
        constraints: "role settingsEntries only: one per canonical kind, plus any extra app entries found"
    relationships:
      - entity: HookEntry
        cardinality: one-to-many
        direction: "a settingsEntries InstallFile holds 4..n HookEntry"

  - name: HookEntry
    description: >
      One of the app's hooks inside .claude/settings.json: an inner hook object whose command runs a
      script in .thadeus/hooks/ (BR7.1), with the matcher of the group that holds it. A canonical
      kind with no such hook is a HookEntry with status missing.
    identifier: "kind + position (position null when missing)"
    attributes:
      - name: kind
        type: enum
        required: true
        allowed: [question, answered, permission, reply, unknown]
        constraints: "the script argument; unknown when the command names another argument or script"
      - name: hookEvent
        type: enum
        required: true
        allowed: [PreToolUse, PostToolUse, PermissionRequest, Stop, other]
      - name: matcher
        type: string
        required: false
        default: null
        constraints: "the holding group's matcher; null when the group has none"
      - name: timeout
        type: integer
        required: false
        min: 1
        constraints: "seconds, as found"
      - name: command
        type: string
        required: false
        constraints: "exactly as found; null when missing"
      - name: status
        type: enum
        required: true
        allowed: [current, outOfDate, missing, editedByHand]
        constraints: "BR7.4; a second app hook of the same kind is editedByHand (BR7.6)"
      - name: position
        type: object
        required: false
        default: null
        constraints: "{ hookEvent, groupIndex, hookIndex } plus the byte span of the inner hook object in the file text; used to splice (BR7.10)"

  - name: InstallPreview
    description: "One proposed install, update or remove for one HookInstallation, shown in M8 and applied at most once."
    identifier: previewId
    attributes:
      - name: previewId
        type: string
        required: true
        unique: true
        constraints: "random, unguessable; valid for one apply in this app run"
      - name: installationKey
        type: string
        required: true
        references: HookInstallation.installationKey
      - name: action
        type: enum
        required: true
        allowed: [install, update, remove]
      - name: createdAt
        type: timestamp
        required: true
      - name: files
        type: list<PreviewFile>
        required: true
        constraints: "every file the action would write, create or delete; never empty unless nothing changes (BR7.7)"
      - name: state
        type: enum
        required: true
        allowed: [open, applied, refused, superseded]
        default: open
    relationships:
      - entity: PreviewFile
        cardinality: one-to-many
        direction: "an InstallPreview holds 1..2 PreviewFile"

  - name: PreviewFile
    description: "Value object: what the preview shows and later writes for one file."
    attributes:
      - name: path
        type: path
        required: true
      - name: change
        type: enum
        required: true
        allowed: [create, modify, delete, none]
      - name: summary
        type: string
        required: true
        constraints: "one translated line, e.g. '4 entries added, others unchanged', 'new file', '1 entry edited by hand will be replaced'"
      - name: diff
        type: text
        required: true
        constraints: "unified diff of the file text; for settings only the app's spans with a few lines of context"
      - name: replacesHandEdit
        type: boolean
        required: true
        default: false
        constraints: "true when any part this file change replaces is editedByHand [Q1]"
      - name: baseDigest
        type: string
        required: false
        constraints: "digest of the bytes the diff was built from; null when the file was absent"
      - name: nextContent
        type: bytes
        required: false
        constraints: "the full new file bytes; null for delete and none; kept in main only, never sent to the renderer"

  - name: CanonicalRelease
    description: >
      Value object built into the app: the exact content the app writes in one release, and the same
      for every earlier release, used to tell outOfDate from editedByHand (BR7.4).
    attributes:
      - name: release
        type: string
        required: true
        constraints: "the app version that introduced this content, e.g. v0.3.0"
      - name: isCurrent
        type: boolean
        required: true
        constraints: "exactly one CanonicalRelease is current"
      - name: entries
        type: list<object>
        required: true
        constraints: "{ kind, hookEvent, matcher, hook: { type, command, timeout } } for each kind (BR7.2)"
      - name: scriptDigest
        type: string
        required: true
      - name: pluginDigest
        type: string
        required: true

  - name: ApplyResult
    description: "Value object returned by apply: the new status, or one refusal."
    attributes:
      - name: outcome
        type: enum
        required: true
        allowed: [written, nothingToChange, refused, partiallyWritten]
      - name: refusal
        type: enum
        required: false
        allowed: [previewUnknown, changedSincePreview, invalidJson, unexpectedShape, cannotRead, cannotWrite, outsideRoot]
      - name: file
        type: path
        required: false
        constraints: "the file the refusal or partial write is about"
      - name: sentence
        type: string
        required: false
        constraints: "one translated sentence naming the file and the reason (BR7.12, BR7.14)"
      - name: status
        type: list<object>
        required: true
        constraints: "the recomputed { harness, files: [{ path, status }], status } (C4 agentHooks.status shape)"
```

## Summary

- **HookInstallation** is the aggregate root: one per project and harness, owned by HookInstaller, recomputed from disk and never stored. Its `status` is derived from its files, and `isCurrent` (C5) is that status being `current`.
- **InstallFile** is one of three fixed paths. The settings file is shared, so the app owns only its **HookEntry** items in it; the script and the plugin are owned whole.
- **InstallPreview** with its **PreviewFile** items is what M8 shows and what apply writes, once, after the person's yes.
- **CanonicalRelease** is built into the app and is the only way to tell "out of date" (an earlier app release) from "edited by hand" (anything else).
- **ApplyResult** carries the one-sentence refusal or the fresh status back to the renderer.
