# Security Design: U7 u7-constitution

Sources: `security-requirements.md` (NFR3.1–NFR3.4, NFR5.1, NFR5.2), `tech-stack-decisions.md`, the U7 `functional-spec.md`, and contract C6 in `contract-summary.md`. The design reuses what U6 already ships in `src/main/speckitFeatures.js` and `src/main/projectAccess.js`.

## One read path for every U7 file

Every file `speckit:rules` reads (the constitution, `extensions.yml`, each `extensions/<id>/extension.yml`) goes through one function, `readSpeckitFile(realRoot, rel)`:

```js
// returns { text } | { missing: true } | { error: reason }
abs  = await resolveInRoot(realRoot, rel)   // ENOENT -> missing; outside root (abs, .., link) -> error
if ((await fs.stat(abs)).size > MAX_READ_BYTES) -> error tooLarge   // size before read (NFR5.2)
text = utf8Fatal.decode(await fs.readFile(abs))                     // not UTF-8 -> error notUtf8
```

- `resolveInRoot` is the existing real-path containment check: a symbolic link inside the project is followed only when its real target is still inside the root (NFR3.2). `realRoot` is `fs.realpath(root)`, as in `loadSpeckitFeatures`.
- `MAX_READ_BYTES` (1 MB) and the strict UTF-8 decoder are U6's; `readLimited` in `speckitFeatures.js` is changed to call `resolveInRoot` first and is exported, so U6 and U7 share one bounded, contained read.
- The module calls only `stat`, `readFile` and `realpath`, which keeps BR7.7 read-only by construction (NFR3.1).

## Names and ids

| Value | Check | On failure |
|---|---|---|
| Extension id (from `installed` or a hook) | `^[a-z0-9][a-z0-9._-]{0,99}$` and not `.`/`..` before any path is built | extension shows with `commands: []`, `errors` names it (NFR3.2) |
| Command name (manifest `provides.commands[].name`, hook `command`) | `^[a-z0-9][a-z0-9._-]{0,99}$` (at most 100 characters) | value left out, `errors` names the file and the reason (NFR3.3) |

The 200-character fixture in NFR3.3's test is therefore refused. Both checks sit in the main process, so no renderer code can bypass them; U5 (C7) receives only names that passed.

## Writes in `.specify/`

`speckit:rules` writes nothing (NFR3.1). The one sanctioned write in `.specify/` is the person saving the constitution in the editor, which U6's editor rule already allows (BR7.2, FR7.1). The write-spy test covers `loadSpeckitRules`, `hooksFrom` and the watcher callback.

## Renderer boundary

- `speckit:rules` returns root-relative paths only (NFR3.4).
- Open in editor sends the fixed constant `.specify/memory/constitution.md`; the main-side editor open handler checks the path through `resolveInRoot` as for every other file, so a forged renderer call cannot reach outside the project.
- The constitution renders through `ArtifactReader` with `skipHtml` (raw HTML dropped) and react-markdown's default URL filter, which removes `javascript:` and other unsafe link and image URLs (NFR5.1). Names are rendered as text.

## YAML

`YAML.parse(text)` with default options: core schema (no custom tags, no code), alias limit 100, so an alias bomb throws and is named in `errors` (NFR5.2). A root that is not a mapping is treated as a parse failure (BR7.3).
