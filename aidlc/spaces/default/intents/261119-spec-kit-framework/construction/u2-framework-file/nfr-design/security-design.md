# Security Design: u2-framework-file (US-1408)

Sources: `security-requirements.md` (NFR3.1–NFR3.6, NFR1.1, NFR8.1), `tech-stack-decisions.md`, `functional-spec.md` (W1, W2), `contract-summary.md` (C2).

One module, `src/main/projectFile.js`, in the main process. Inputs that cannot be trusted: the bytes of `.thadeus/project.json` and the folder layout of a cloned repository. The framework value to write comes from U4 or U8, after the person confirms.

## Read path (W1)

1. `lstat` `.thadeus/`. Missing gives `missing`. A symlink, or anything that is not a folder, gives `unreadable` (NFR3.1).
2. `lstat` `.thadeus/project.json` the same way. It must be a regular file.
3. Open it and read at most 64 KiB + 1 byte. More than 64 KiB read gives `unreadable`. The check uses the bytes actually read, not the `lstat` size, so a file that grows between the two calls is still capped (NFR3.2).
4. `JSON.parse` inside `try`. Any error, including a `RangeError` from very deep nesting, gives `unreadable`. Nothing else parses the bytes (NFR3.3).
5. Classify as in BR1.2. The read function has no write call in it (NFR3.6).

## Write path (W2)

1. Check the framework (BR2.2), then run the read path.
2. Refuse `unknownVersion` with `newerVersion` (BR2.5).
3. Build the content. For `ok` and `unknownFramework`: `{ ...parsed, version: 1, framework }`. Spread copies with define semantics, so a `__proto__` key stays an ordinary own key and every key is kept (BR2.3). `Object.assign` and bracket assignment are not used, because they would set the prototype. For `unreadable` and `invalid`: `{ version: 1, framework }` and `replaced: true` (BR2.4). Output is `JSON.stringify(value, null, 2) + '\n'`.
4. If `.thadeus/` is missing, `mkdir` it without `recursive`, then `lstat` it again.
5. `writeAtomic(abs, bytes, { expect })`, where `expect` repeats the two `lstat` checks just before the rename. A symlink placed between steps 1 and 5 aborts the write as `writeFailed`. The temp file is removed and the old file stays (NFR3.4).

```js
// interface only
readProjectFile(root) -> { ok: true, value } | { ok: false, reason }
writeProjectFile(root, framework) -> { ok: true, file, replaced } | { ok: false, error: { code, message } }
```

## Messages (NFR1.1)

Reason and error texts are `t()` keys with the file name and reason code as placeholders. The `newerVersion` text names the version only when `Number.isSafeInteger(version)`. Otherwise it shows no number. A `framework` value from the file never appears in a message.

## Decisions

| Concern | Decision | Alternative rejected |
|---|---|---|
| A symlink race between check and rename | Check again in `writeAtomic`'s `expect` hook. `ponytail:` comment: a race inside the rename itself remains; that needs `openat`-style calls Node lacks, and a person's own desktop repo makes it unlikely. | No recheck: the window is the whole read and build |
| Keys like `__proto__` (review of NFR3.3) | Keep every key with spread. This meets BR2.3, which wins over NFR3.3's "drop" wording; pollution is prevented by never assigning. | Dropping the keys: loses data BR2.3 says to keep |
| Replacing an unreadable file | No backup file. The project file is committed, so git holds its last content, and `replaced: true` lets U4 and U8 say it was replaced. | A `.bak` copy: a second file to explain and clean up |

## Tests (NFR3.5, NFR8.1)

Real temp folders (`fs.mkdtemp`), test first. Beyond the cases in `security-requirements.md`: a 70 KiB file, JSON nested 100,000 levels, a `__proto__` key that round-trips while `Object.prototype` stays unchanged, a symlink swapped in through `expect`, and a non-integer `version: 1e400` that the message shows without a number. U2's own write test lists the folder tree after a write and asserts that only `.thadeus/project.json` changed. It does not rely on the epic-wide NFR3 test.
