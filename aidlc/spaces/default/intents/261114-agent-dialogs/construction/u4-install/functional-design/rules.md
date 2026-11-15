# Business Rules: u4-install

## Sources

- Story: US4.1 in `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md` (AC4.1.1–AC4.1.6).
- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (FR4.1–FR4.7, NFR4, NFR6, NFR7; Constraints on `isEngineOwned`).
- Unit: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work.md` (U4), `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work-story-map.md`.
- Components and decisions: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/components.md`, `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/decisions.md` (ADR-004, ADR-005).
- Contracts: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C4, C5, C6).
- Mockups: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/refined-mockups/mockups.md` (M7, M8).
- Integration points: `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md` (PreToolUse/PostToolUse on `AskUserQuestion`, timeouts 600 and 10, opencode `form.*`), `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/functional-spec.md` (`PermissionRequest`, `permission.asked`/`permission.replied`), `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/functional-spec.md` (`Stop`, `session.status`); `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/rules.md` (BR2.7).
- Existing code: `src/main/fileWrite.js`, `src/main/projectAccess.js`, `src/main/harness.js`.
- Entities: `entities.md`. Answers: `functional-design-questions.md` Q1 `[Q1]` (A).

## Rules

```yaml
rules:
  - id: BR7.1
    statement: An entry in .claude/settings.json is the app's exactly when its command runs .thadeus/hooks/dialog.sh with one of the kinds question, answered, permission, reply (U4 amendment, SD34).
    category: constraint
    applies_to: HookEntry, HookInstaller
    trigger: every read of .claude/settings.json
    logic: >
      For every inner hook object under hooks.<event>[].hooks[], IF appKind(command) gives a kind
      (the command runs exactly .thadeus/hooks/dialog.sh followed by one of the four kinds) THEN it is an
      app HookEntry of that kind ELSE it is someone else's (also another script in .thadeus/hooks/ or an
      unknown kind) and the app never changes, moves or reformats it. No marker key is read or written
      (ADR-004). The plugin path .opencode/plugins/thadeus-dialog.ts in these rules reads .js (tech-stack D4).
    violation: none; a command edited so it no longer names the folder is not the app's, and that kind shows as missing
    source: FR4.3

  - id: BR7.2
    statement: For Claude Code the app installs exactly four entries, each with the guarded command, plus the committed script.
    category: constraint
    applies_to: CanonicalRelease.entries, InstallFile (.claude/settings.json, .thadeus/hooks/dialog.sh)
    trigger: building a preview (install or update), classifying an entry
    logic: >
      The canonical entries are: question = PreToolUse, matcher "AskUserQuestion", timeout 600;
      answered = PostToolUse, matcher "AskUserQuestion", timeout 10; permission = PermissionRequest,
      matcher "*", timeout 600; reply = Stop, no matcher, timeout 10. Each is one group holding one
      hook { type: command, command: C(kind), timeout }, where C(kind) is
      [ -n "$THADEUS_SESSION_DIR" ] && [ -f "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" ] && sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" <kind>; exit 0
      So without the session variable, or without the script, the command runs two shell tests and
      exits 0 with no output, starting no process. The script is written with LF line ends and run
      through sh, so it needs no executable bit.
    violation: an entry differing from this is outOfDate or editedByHand (BR7.4)
    source: FR4.1, FR4.4, FR4.6, NFR4

  - id: BR7.3
    statement: For opencode the app installs one plugin file that does nothing outside an app session.
    category: constraint
    applies_to: CanonicalRelease.pluginDigest, InstallFile (.opencode/plugins/thadeus-dialog.ts)
    trigger: building a preview, classifying the plugin file
    logic: >
      The plugin is .opencode/plugins/thadeus-dialog.ts, written for opencode's plugin API V2 and
      loaded by opencode from that folder without any config entry. Its setup first reads
      THADEUS_SESSION_DIR; IF absent THEN it registers no handler and returns at once. ELSE it
      subscribes to form.created, form.replied, form.cancelled (u1), permission.asked,
      permission.replied (u2) and session.status (u3), and each handler hands its work to its own
      async task so opencode is never held by the plugin outside a waiting question or permission.
    violation: a differing file is outOfDate or editedByHand (BR7.4)
    source: FR4.1, FR4.4, FR4.7, NFR4

  - id: BR7.4
    statement: Each app entry and each app-owned file is current, outOfDate, editedByHand or missing.
    category: calculation
    applies_to: HookEntry.status, InstallFile.status (script, plugin)
    trigger: every status computation (BR7.17)
    logic: >
      Script and plugin: IF absent THEN missing; IF the digest of the exact bytes equals the current
      CanonicalRelease THEN current; IF it equals an earlier CanonicalRelease THEN outOfDate; ELSE
      editedByHand. Settings entry, compared by parsed value (whitespace and key order ignored): IF no
      app hook of that kind THEN missing; IF matcher, type, command and timeout equal the current
      release and the hook has no other key THEN current; IF they equal an earlier release THEN
      outOfDate; ELSE editedByHand.
    violation: none
    source: FR4.3, FR4.5

  - id: BR7.5
    statement: The settings file's status and the harness status are derived, and only an all-current harness counts as current.
    category: calculation
    applies_to: InstallFile.status (settingsEntries), HookInstallation.status, C5 isCurrent
    trigger: every status computation
    logic: >
      Settings file: IF every entry is missing THEN missing; IF every canonical kind is current and
      there is no extra app entry THEN current; IF any entry is editedByHand THEN editedByHand; ELSE
      outOfDate. Harness: IF every file is missing THEN missing; IF every file is current THEN
      current; IF any file is editedByHand THEN editedByHand; ELSE outOfDate. isCurrent(projectRoot,
      harness) is true exactly when the harness status is current.
    violation: none
    source: FR4.3, FR4.5

  - id: BR7.6
    statement: One app entry per kind; extras are hand edits that Update removes.
    category: validation
    applies_to: HookEntry
    trigger: classifying the settings file
    logic: >
      IF more than one app hook has the same kind THEN every one of them is editedByHand. IF an app
      hook has kind unknown, or sits under an event the canonical set does not use THEN it is
      editedByHand. Update keeps at most one canonical hook per kind and removes the others; Remove
      removes them all.
    violation: none; shown in the preview as removed lines
    source: FR4.3

  - id: BR7.7
    statement: A preview names every file, says it is committed and shared, and shows each change as a diff.
    category: policy
    applies_to: InstallPreview, PreviewFile, AgentDialogsSetupUI (M8)
    trigger: the person chooses Install, Update or Remove
    logic: >
      For the chosen harness and action the preview lists every file it would create, modify or
      delete, each with its path, a one-line summary and a unified diff (signs as well as colour),
      under the lines "These files are committed and shared with your team." and "Teammates without
      the app are not affected." The settings diff shows only the app's spans with a few lines of
      context and states that other entries are unchanged. A file with change none is listed as
      already current. IF no file would change THEN the preview says so and offers no apply button.
    violation: none
    source: FR4.2, FR4.3

  - id: BR7.8
    statement: A hand edit is replaced only through the preview, after the person's yes.
    category: policy
    applies_to: PreviewFile.replacesHandEdit, Update
    trigger: building an update preview over an editedByHand entry or file
    logic: >
      IF any part an update would replace is editedByHand THEN that file's summary says
      "edited by hand, will be replaced by the app's version", its diff shows the hand-edited lines
      removed and the app's lines added, and replacesHandEdit is true. The edit is replaced only by
      applying that preview. A hand-edited part is never skipped and never merged [Q1].
    violation: none
    source: FR4.2, FR4.3

  - id: BR7.9
    statement: Nothing is written without the person's yes, and a preview is applied at most once.
    category: authorization
    applies_to: InstallPreview, HookInstaller.apply
    trigger: agentHooks.apply(projectId, previewId)
    logic: >
      Apply writes only for a previewId that exists, is open and belongs to that project. IF it is
      unknown, applied, refused or superseded THEN refuse with previewUnknown and write nothing. A new
      preview for the same project and harness supersedes the open one. Applies for one project run
      one at a time, so a second click while the first runs finds the preview no longer open. No
      status computation, project open or app start ever writes.
    violation: refusal previewUnknown; nothing written
    source: FR4.2

  - id: BR7.10
    statement: Only the app's own spans of .claude/settings.json change; every other byte stays as it was.
    category: constraint
    applies_to: HookInstaller (settings edit)
    trigger: building nextContent for the settings file
    logic: >
      The new file text is the old text with splices only: an app hook replaced in place, an app hook
      removed together with its separator, a group or event array removed only when the app's removal
      emptied it, and a new group appended at the end of its event array (or a new event key at the end
      of hooks, or hooks at the end of the root object). Inserted text follows the file's own
      indentation and line ends; a byte order mark and a final newline are kept as found. The file is
      never parsed and re-serialised as a whole. After splicing, the result must parse and every
      non-app value must equal the old one, ELSE refuse with unexpectedShape.
    violation: refusal unexpectedShape; nothing written
    source: FR4.3

  - id: BR7.11
    statement: A missing settings file is created holding only the app's entries.
    category: policy
    applies_to: InstallFile (.claude/settings.json)
    trigger: install or update preview when .claude/settings.json is absent
    logic: >
      IF the file is absent THEN the preview shows change create with a file of one root object whose
      only key is hooks with the four canonical entries, two-space indentation and a final newline;
      apply creates the .claude folder when needed. The same holds for .thadeus/hooks/ and
      .opencode/plugins/.
    violation: none
    source: FR4.7

  - id: BR7.12
    statement: A file that cannot be read, parsed or written blocks the whole apply, and the reason is given in one sentence.
    category: validation
    applies_to: HookInstaller, ApplyResult, InstallFile.reason
    trigger: status computation, preview, apply
    logic: >
      IF .claude/settings.json is not valid JSON, or its root is not an object, or hooks is not an
      object, or an event value is not an array, or a group's hooks is not an array THEN its status is
      missing with reason, the preview offers no apply, and any apply is refused with invalidJson or
      unexpectedShape. IF a file cannot be read or written (permission, read-only disk, disk full)
      THEN refuse with cannotRead or cannotWrite. In every case nothing is written, the sentence names
      the file and the reason ("Nothing was written: .claude/settings.json is not valid JSON."), and
      the harness keeps the fallback. The same rules hold for the plugin file.
    violation: refusal; nothing written
    source: FR4.7, FR4.5

  - id: BR7.13
    statement: The installer writes only its three fixed paths and their folders, inside the project root.
    category: authorization
    applies_to: HookInstaller
    trigger: every write and delete
    logic: >
      The only paths written or deleted are .claude/settings.json, .thadeus/hooks/dialog.sh and
      .opencode/plugins/thadeus-dialog.ts, plus creating or removing their own folders. Each is
      resolved to its real path, which must lie inside the project root, ELSE refuse with outsideRoot.
      This write path is separate from the editor's: the editor's engine-owned rule for .claude/ and
      .opencode/ stays unchanged, and the renderer names only projectId, harness, action and previewId,
      never a path.
    violation: refusal outsideRoot; nothing written
    source: FR4.3, FR4.2

  - id: BR7.14
    statement: Every file is read again just before writing, and nothing is written if any changed since the preview.
    category: validation
    applies_to: HookInstaller.apply, PreviewFile.baseDigest
    trigger: agentHooks.apply
    logic: >
      Before the first write, read every file of the preview again. IF any file's digest differs from
      its baseDigest (or it appeared or vanished) THEN write nothing, mark the preview superseded,
      refuse with changedSincePreview naming that file, and the dialog builds and shows the new preview
      ("<file> changed since this preview. Look at the new preview.").
    violation: refusal changedSincePreview; nothing written
    source: FR4.7

  - id: BR7.15
    statement: Each harness the project uses whose part is not current shows the fallback notice with Install or Update.
    category: policy
    applies_to: AgentDialogsSetupUI (M7), HookInstallation.used
    trigger: project view opens; any status change
    logic: >
      For each harness with used true and status other than current, show the M7 strip: status
      missing reads "the app's hooks are missing" with Install; outOfDate and editedByHand read "the
      app's hooks are out of date" with Update; both offer Details, which opens Project settings at
      Agent dialogs with each file's status in words and Install, Update and Remove as they apply.
      A harness is used when the project has its folder markers (detectHarnesses) or an agent tab of
      it was opened in this app run. The strip can be dismissed for this app run. While the strip shows,
      that harness's tabs use today's fallback unchanged (u1 BR2.7).
    violation: none
    source: FR4.5

  - id: BR7.16
    statement: Every write is atomic, and files are written in an order that never leaves an entry without its script.
    category: constraint
    applies_to: HookInstaller.apply
    trigger: apply after BR7.14 passed
    logic: >
      Each file is written to a temporary file in the same folder and renamed over the target; a
      failed write removes the temporary file and leaves the old file intact. Install and update write
      the script before .claude/settings.json; remove changes .claude/settings.json before deleting
      the script. IF a later file fails after an earlier one was written THEN the outcome is
      partiallyWritten, naming the file not written and the reason in one sentence; the earlier file
      stays, which is harmless because the command checks for the script (BR7.2), and the status shows
      outOfDate with Update.
    violation: partiallyWritten with one sentence
    source: FR4.7

  - id: BR7.17
    statement: Status is recomputed from disk on project open, after every apply, and whenever one of the files changes.
    category: policy
    applies_to: HookInstallation, AgentEventStore, AgentDialogsSetupUI
    trigger: project opens; apply ends; a watched path changes (for example AI-DLC rewrites .claude/settings.json)
    logic: >
      Read the three paths, classify them (BR7.4, BR7.5), and IF any status changed THEN tell the
      AgentEventStore (source choice) and push the new status to the renderer. Computing status never
      writes. An open preview whose base no longer matches is not applied (BR7.14).
    violation: none
    source: FR4.3, FR4.5

  - id: BR7.18
    statement: A tab uses hook events only when its harness was current when the tab started and still is.
    category: policy
    applies_to: AgentEventStore source choice (replaces U1's development switch, C5)
    trigger: an agent tab spawns; a status change
    logic: >
      At spawn, record isCurrent(projectRoot, harness) on the session. The tab uses hook events IF that
      value was true AND isCurrent is still true ELSE today's fallback. After a successful install or
      update the result line says running tabs of that harness use the dialog after a restart, because
      the harness reads its hook settings when the session starts. After remove, the harness's tabs go
      to the fallback at once.
    violation: none
    source: FR4.5

  - id: BR7.19
    statement: Remove takes out the app's entries, script and plugin and nothing else.
    category: policy
    applies_to: HookInstaller (remove)
    trigger: building and applying a remove preview
    logic: >
      Claude Code: remove every app hook (BR7.1) from .claude/settings.json, then any group, event array
      or hooks object that this removal left empty, and delete .thadeus/hooks/dialog.sh, then
      .thadeus/hooks/ and .thadeus/ when they are empty. opencode: delete the plugin file only. The
      settings file itself is never deleted. Hand-edited app parts are removed too, shown in the
      preview with only "-" lines.
    violation: none
    source: FR4.3

  - id: BR7.20
    statement: Every setup text is translated, and every status is named in words.
    category: policy
    applies_to: AgentDialogsSetupUI
    trigger: rendering M7, M8 and the Project settings section
    logic: >
      Every app text goes through t() with the same keys in sv.json and en.json; statuses read
      "present and current", "out of date", "missing" and "edited by hand", never shown by colour
      alone; the preview is usable by keyboard with focus on Cancel when it opens.
    violation: none
    source: NFR7, NFR6
```

## Rules summary

| Rule | Category | In short | Source |
|---|---|---|---|
| BR7.1 | constraint | App entry = command runs `.thadeus/hooks/dialog.sh` with a known kind (U4 amendment) | FR4.3 |
| BR7.2 | constraint | Claude Code: four guarded entries and the script | FR4.1, FR4.4, FR4.6, NFR4 |
| BR7.3 | constraint | opencode: one plugin file, idle outside app sessions | FR4.1, FR4.4, FR4.7, NFR4 |
| BR7.4 | calculation | current / outOfDate / editedByHand / missing per entry and file | FR4.3, FR4.5 |
| BR7.5 | calculation | Settings and harness status derived; isCurrent only when all current | FR4.3, FR4.5 |
| BR7.6 | validation | One app entry per kind; extras are hand edits | FR4.3 |
| BR7.7 | policy | Preview names every file, committed and shared, with diffs | FR4.2, FR4.3 |
| BR7.8 | policy | Hand edits replaced only through the preview `[Q1]` | FR4.2, FR4.3 |
| BR7.9 | authorization | Nothing written without yes; a preview applies once | FR4.2 |
| BR7.10 | constraint | Splice only the app's spans; other bytes unchanged | FR4.3 |
| BR7.11 | policy | Missing settings file created with only the app's entries | FR4.7 |
| BR7.12 | validation | Unreadable, invalid or unwritable: nothing written, one sentence | FR4.7, FR4.5 |
| BR7.13 | authorization | Three fixed paths inside the root, separate from the editor | FR4.3, FR4.2 |
| BR7.14 | validation | Re-read before writing; changed since preview writes nothing | FR4.7 |
| BR7.15 | policy | Fallback notice per used harness, Install or Update | FR4.5 |
| BR7.16 | constraint | Atomic writes; script before entries, entries before script on remove | FR4.7 |
| BR7.17 | policy | Status from disk on open, after apply, on file change | FR4.3, FR4.5 |
| BR7.18 | policy | Hook events only for tabs started while current | FR4.5 |
| BR7.19 | policy | Remove takes out only the app's parts | FR4.3 |
| BR7.20 | policy | Texts in sv and en; statuses in words | NFR7, NFR6 |
