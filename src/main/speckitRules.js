// US-1404 FR7: a Spec Kit project's rules, its constitution, extensions and hooks (contract C6). Read-only (BR7.7,
// NFR3.1): this module only calls stat, readFile and realpath. Names that reach the renderer are checked (NFR3.3).
import { promises as fs } from 'node:fs';
import YAML from 'yaml';
import { resolveInRoot } from './projectAccess.js';
import { readLimited } from './speckitFeatures.js';
import { t } from '../shared/i18n.js';

export const CONSTITUTION = '.specify/memory/constitution.md';
export const EXTENSIONS_FILE = '.specify/extensions.yml';
/** NFR3.2, NFR3.3: Spec Kit's own form for an extension id or a command name (`speckit.git.commit`), at most 100 characters. */
export const SAFE_NAME = /^[a-z0-9][a-z0-9._-]{0,99}$/;
const HOOK_KEY = /^(before|after)_(.+)$/;
const manifestPath = (id) => `.specify/extensions/${id}/extension.yml`;
const reason = (key, values) => t(`speckit.reason.${key}`, values);
const isMapping = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const asList = (v) => (Array.isArray(v) ? v : [v]);

/** BR7.5: off when enabled is false, else mandatory when optional is false, else optional (Spec Kit's defaults). */
const modeOf = (e) => (e.enabled === false ? 'off' : e.optional === false ? 'mandatory' : 'optional');

/**
 * US-1404 FR7.2, BR7.4: the hooks under `hooks` in a parsed extensions.yml. Each `before_<x>` or `after_<x>` key holds
 * a list of entries (a single mapping counts as one); an entry needs a string `extension` and a safe `command`.
 * Anything else is skipped and counted; `unsafe` counts the commands left out for their name (NFR3.3).
 * @param {object} config the parsed extensions.yml root
 * @returns {{hooks: {extension: string, when: 'before'|'after', target: string, command: string, mode: string, condition: string|null}[], skipped: number, unsafe: number}}
 */
export function hooksFrom(config) {
  const out = { hooks: [], skipped: 0, unsafe: 0 };
  const raw = config?.hooks;
  if (raw === undefined || raw === null) return out;
  if (!isMapping(raw)) return { ...out, skipped: 1 };
  for (const [key, value] of Object.entries(raw)) {
    const m = HOOK_KEY.exec(key);
    for (const e of asList(value)) {
      if (!m || !isMapping(e) || typeof e.extension !== 'string' || typeof e.command !== 'string' || !e.command) {
        out.skipped++;
      } else if (!SAFE_NAME.test(e.command)) {
        out.skipped++;
        out.unsafe++;
      } else {
        const condition = typeof e.condition === 'string' && e.condition ? e.condition : null;
        out.hooks.push({ extension: e.extension, when: m[1], target: m[2], command: e.command, mode: modeOf(e), condition });
      }
    }
  }
  return out;
}

/**
 * NFR3.2, NFR5.2: `{ text }`, `{ missing: true }` or `{ error: reason }` for one root-relative file. The real path must
 * stay in the root (a link out is refused), it must be a regular file (a folder or a FIFO is never opened), and
 * readLimited keeps it to 1 MB of UTF-8.
 * ponytail: stat, then read; a file that grows between the two calls is read in full. A bounded open+read if it matters.
 */
async function readSpeckitFile(realRoot, rel) {
  try {
    const abs = await resolveInRoot(realRoot, rel);
    if (!(await fs.stat(abs)).isFile()) return { error: reason('notFile') };
  } catch (err) {
    if (err.code === 'ENOENT') return { missing: true };
    return { error: err.code ? reason('unreadable', { code: err.code }) : reason('outsideRoot') };
  }
  return readLimited(realRoot, rel);
}

/** BR7.3, NFR5.2: a YAML mapping with the parser's default limits (core schema, 100 aliases); an empty file is `{}`. */
function parseMapping(text) {
  let value;
  try {
    value = YAML.parse(text) ?? {};
  } catch (err) {
    return { error: reason('yaml', { error: String(err.message).split('\n')[0] }) };
  }
  return isMapping(value) ? { value } : { error: reason('notMapping') };
}

/** BR7.6: the safe command names in an extension's manifest, `provides.commands[].name`; every failure is named. */
async function readCommands(realRoot, id) {
  const rel = manifestPath(id);
  const r = await readSpeckitFile(realRoot, rel);
  const parsed = r.missing ? { error: reason('noManifest') } : r.error ? r : parseMapping(r.text);
  if (parsed.error) return { commands: [], errors: [{ path: rel, reason: parsed.error }] };
  const list = parsed.value.provides?.commands;
  const names = (Array.isArray(list) ? list : []).map((c) => c?.name);
  const commands = names.filter((n) => typeof n === 'string' && SAFE_NAME.test(n));
  const bad = names.length - commands.length;
  return { commands, errors: bad ? [{ path: rel, reason: reason('unsafeNames', { count: bad }) }] : [] };
}

/** BR7.6: ids from `installed` (a string, or a mapping with `id`) and from the hooks, deduplicated and sorted. */
function extensionIds(config, hooks) {
  const installed = (Array.isArray(config.installed) ? config.installed : []).map((e) => (typeof e === 'string' ? e : e?.id));
  return [...new Set([...installed.filter((id) => typeof id === 'string' && id), ...hooks.map((h) => h.extension)])].sort();
}

/** One extension: its commands when its id is safe to build a path from (NFR3.2), and its hooks. */
async function readExtension(realRoot, id, hooks) {
  const own = hooks
    .filter((h) => h.extension === id)
    .map((h) => ({ when: h.when, target: h.target, command: h.command, mode: h.mode, condition: h.condition }));
  if (!SAFE_NAME.test(id)) return { extension: { id, commands: [], hooks: own }, errors: [{ path: EXTENSIONS_FILE, reason: reason('unsafeId', { id }) }] };
  const { commands, errors } = await readCommands(realRoot, id);
  return { extension: { id, commands, hooks: own }, errors };
}

/** BR7.3–BR7.6: the extensions with their commands and hooks; a file that cannot be read means no hooks were checked. */
async function readExtensions(realRoot) {
  const r = await readSpeckitFile(realRoot, EXTENSIONS_FILE);
  if (r.missing) return { extensions: [], skipped: 0, hooksChecked: true, errors: [] };
  const parsed = r.error ? r : parseMapping(r.text);
  if (parsed.error) return { extensions: [], skipped: 0, hooksChecked: false, errors: [{ path: EXTENSIONS_FILE, reason: parsed.error }] };
  const { hooks, skipped, unsafe } = hooksFrom(parsed.value);
  const read = await Promise.all(extensionIds(parsed.value, hooks).map((id) => readExtension(realRoot, id, hooks)));
  const errors = unsafe ? [{ path: EXTENSIONS_FILE, reason: reason('unsafeNames', { count: unsafe }) }] : [];
  return { extensions: read.map((x) => x.extension), skipped, hooksChecked: true, errors: [...errors, ...read.flatMap((x) => x.errors)] };
}

/** BR7.1: the constitution exists when it is a readable file; a missing one is not an error. */
async function readConstitution(realRoot) {
  const r = await readSpeckitFile(realRoot, CONSTITUTION);
  return { constitution: { path: CONSTITUTION, exists: r.text !== undefined }, errors: r.error ? [{ path: CONSTITUTION, reason: r.error }] : [] };
}

/**
 * US-1404 FR7 (contract C6): `{ constitution: { path, exists }, extensions: [{ id, commands, hooks }], skipped,
 * hooksChecked, errors: [{ path, reason }] }`, every path root-relative (NFR3.4). A file that cannot be read goes in
 * errors and never hides the rest (FR7.3). Nothing is written (BR7.7).
 * @param {string} root the project root
 */
export async function loadSpeckitRules(root) {
  const realRoot = await fs.realpath(root);
  const [c, x] = await Promise.all([readConstitution(realRoot), readExtensions(realRoot)]);
  return { constitution: c.constitution, extensions: x.extensions, skipped: x.skipped, hooksChecked: x.hooksChecked, errors: [...c.errors, ...x.errors] };
}
