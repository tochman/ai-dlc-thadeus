// US-0506 u4 US4.1: the agent dialog hooks in a project. HookInstaller (LC30) reads, previews and writes the app's
// three files; SettingsSplicer (LC31) edits only the app's spans of .claude/settings.json. BR7.1–BR7.20, ADR-004.
// Nothing here writes without an applied preview (BR7.9), and every doubt is a refusal, never a damaged file (SD34).
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import SCRIPT_RAW from '../../.thadeus/hooks/dialog.sh?raw';
import PLUGIN_RAW from '../../.opencode/plugins/thadeus-dialog.js?raw';
import { WAIT_SECONDS } from './agentChannel.js';
import { writeAtomic } from './fileWrite.js';
import { resolveInRoot } from './projectAccess.js';
import { watchFiles } from './watcher.js';
import { t } from '../shared/i18n.js';

/** SD30: the only paths the installer reads, writes or deletes (D4: the plugin is .js). */
export const FILES = { settings: '.claude/settings.json', script: '.thadeus/hooks/dialog.sh', plugin: '.opencode/plugins/thadeus-dialog.js' };
export const HARNESS_FILES = { claude: ['settings', 'script'], opencode: ['plugin'] };
export const ACTIONS = ['install', 'update', 'remove'];
// US-0213 FR1.3, FR1.5, FR4.2, FR8.1: session (SessionStart), notify (Notification), precompact (PreCompact) and
// postcompact (PostCompact) never wait.
export const KINDS = ['question', 'answered', 'permission', 'reply', 'session', 'notify', 'precompact', 'postcompact'];

// C6: the one command string; only the kind is filled in, so no project data enters a command (SD35).
const C6 =
  '[ -n "$THADEUS_SESSION_DIR" ] && [ -f "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" ] && sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" <kind>; exit 0';
/** The canonical command of a kind (BR7.2). */
export const command = (kind) => C6.replace('<kind>', kind);

// The whole command must have the shape the app writes: the C6 string, optionally without either guard or the
// trailing exit, with the script named exactly as "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" or
// .thadeus/hooks/dialog.sh. Anything before or after it (another command, another path, another argument) is not
// the app's, so a teammate's hook that only mentions dialog.sh is never changed (review iteration 1).
const RUN =
  /^(?:\[ -n "\$THADEUS_SESSION_DIR" \] && )?(?:\[ -f "\$CLAUDE_PROJECT_DIR\/\.thadeus\/hooks\/dialog\.sh" \] && )?sh (?:"\$CLAUDE_PROJECT_DIR\/\.thadeus\/hooks\/dialog\.sh"|\.thadeus\/hooks\/dialog\.sh) ([a-z]+)(?: ?; ?exit 0)?$/;
/** US-0506 u4 BR7.1 (as amended, SD34, RD38): the kind of an app entry's command, or null when it is not the app's. */
export function appKind(cmd) {
  if (typeof cmd !== 'string') return null;
  for (const r of RELEASES) for (const k of KINDS) if (r.entries[k]?.command === cmd) return k; // every release's exact string
  const m = RUN.exec(cmd);
  return m && KINDS.includes(m[1]) ? m[1] : null;
}

// RD41: the waiting entries' timeout sits 5 s above the script's wait, from the same constant main passes it.
const WAITING_TIMEOUT = WAIT_SECONDS.claude + 5;
const entry = (event, matcher, timeout, kind) => ({ event, matcher, timeout, command: command(kind) });
// US-0213 NFR3: a report-only entry runs async, so it can never slow the agent. The waiting kinds stay sync (they return
// an answer), and so does PreCompact (its printed instruction must reach the compaction).
const report = (event, matcher, kind) => ({ ...entry(event, matcher, 10, kind), async: true });
/** The four entries of US-0506, as installed before US-0213 (all sync). */
const DIALOG_ENTRIES = {
  question: entry('PreToolUse', 'AskUserQuestion', WAITING_TIMEOUT, 'question'),
  answered: entry('PostToolUse', 'AskUserQuestion', 10, 'answered'),
  permission: entry('PermissionRequest', '*', WAITING_TIMEOUT, 'permission'),
  reply: entry('Stop', undefined, 10, 'reply')
};
/** BR7.2: the current release's entries, one group each; US-0213 FR1.4 adds four that never wait. */
export const CANONICAL = {
  question: DIALOG_ENTRIES.question,
  answered: report('PostToolUse', 'AskUserQuestion', 'answered'),
  permission: DIALOG_ENTRIES.permission,
  reply: report('Stop', undefined, 'reply'),
  session: report('SessionStart', undefined, 'session'),
  notify: report('Notification', undefined, 'notify'),
  precompact: entry('PreCompact', undefined, 10, 'precompact'),
  postcompact: report('PostCompact', undefined, 'postcompact')
};

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
// D2: the bytes u1–u3 tested, bundled with ?raw; the digests are this release's.
export const SCRIPT_BYTES = Buffer.from(SCRIPT_RAW, 'utf8');
export const PLUGIN_BYTES = Buffer.from(PLUGIN_RAW, 'utf8');
export const CURRENT = { release: 'current', entries: CANONICAL, scriptDigest: sha256(SCRIPT_BYTES), pluginDigest: sha256(PLUGIN_BYTES) };
/**
 * D2: every release, oldest first, the current one last. A release that changes the entries, dialog.sh or the plugin
 * adds the previous `{ release, entries, scriptDigest, pluginDigest }` before CURRENT, so those files read as outOfDate.
 */
export const RELEASES = [
  // US-0210: dialog.sh up to v0.2.8, before `date` moved to every 10th poll.
  {
    release: 'v0.2.8',
    entries: DIALOG_ENTRIES,
    scriptDigest: '3b5ca42f4009660a6da771116fcb67618b7e5c6adebe597648d7983d692132b9',
    pluginDigest: 'b061adbb5f7d64b48906fb48ae294f190156c5b79edc4b529bd46476c5b8d902'
  },
  // US-0213: the four US-0506 entries, dialog.sh and the plugin as US-0210 left them, before the three new kinds.
  {
    release: 'before-US-0213',
    entries: DIALOG_ENTRIES,
    scriptDigest: '42236b11e28a709020cf7684068511f3303410b9b85c6f306b549b59eac5ef01',
    pluginDigest: 'b061adbb5f7d64b48906fb48ae294f190156c5b79edc4b529bd46476c5b8d902'
  },
  CURRENT
];

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * US-0506 u4 SD30: checks every existing part of `rel` with lstat. Absent: `{abs, exists: false, missingDirs}`; a
 * regular file: `{abs, exists: true, missingDirs: []}`; else `{reason, cause?}`. A link is never written through.
 */
export async function checkPath(root, rel) {
  const parts = rel.split('/');
  const abs = path.join(root, rel);
  let deepest = null;
  for (let i = 0; i < parts.length; i++) {
    const prefix = parts.slice(0, i + 1).join('/');
    let st;
    try {
      st = await fs.lstat(path.join(root, prefix));
    } catch (err) {
      if (err.code !== 'ENOENT') return { reason: 'cannotRead', cause: err.code };
      const missingDirs = parts.slice(i, -1).map((_, j) => parts.slice(0, i + j + 1).join('/'));
      return (await insideRoot(root, deepest)) ? { abs, exists: false, missingDirs } : { reason: 'outsideRoot' };
    }
    if (st.isSymbolicLink()) {
      let real;
      try {
        real = await fs.realpath(path.join(root, prefix));
      } catch {
        return { reason: 'cannotWrite', cause: 'link' }; // dangling
      }
      const rootReal = await fs.realpath(root);
      return real === rootReal || real.startsWith(`${rootReal}${path.sep}`) ? { reason: 'cannotWrite', cause: 'link' } : { reason: 'outsideRoot' };
    }
    const last = i === parts.length - 1;
    if (!last && !st.isDirectory()) return { reason: 'cannotWrite', cause: 'ENOTDIR' };
    if (last && !st.isFile()) return { reason: 'cannotWrite', cause: 'notAFile' };
    deepest = prefix;
  }
  return (await insideRoot(root, deepest)) ? { abs, exists: true, missingDirs: [] } : { reason: 'outsideRoot' };
}

/** The deepest existing part resolves to exactly itself inside the root, so no part (nor the root's parents) is a link. */
async function insideRoot(root, rel) {
  if (rel === null) return true;
  try {
    return (await resolveInRoot(root, rel)) === path.join(root, rel);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// SettingsSplicer (LC31, D3): a span finder over the file text. ponytail: strict JSON only; a file with comments or
// trailing commas is refused as invalidJson; switch to jsonc-parser if such files turn up.

const WS = ' \t\n\r';
/** The span tree of valid JSON text: objects keep their members, arrays their items, with start and end offsets. */
function scan(text) {
  let i = 0;
  const ws = () => {
    while (i < text.length && WS.includes(text[i])) i++;
  };
  // A string ends at the first quote not preceded by an odd run of backslashes; indexOf keeps a 1 MB string fast (PD33).
  const string = () => {
    const start = i;
    let end = text.indexOf('"', start + 1);
    for (;;) {
      let back = 0;
      while (text[end - 1 - back] === '\\') back++;
      if (back % 2 === 0) break;
      end = text.indexOf('"', end + 1);
    }
    i = end + 1;
    return text.slice(start + 1, end);
  };
  const value = () => {
    ws();
    const start = i;
    const ch = text[i];
    if (ch === '{' || ch === '[') {
      const object = ch === '{';
      const list = [];
      i++;
      ws();
      if (text[i] !== (object ? '}' : ']')) {
        for (;;) {
          ws();
          const at = i;
          const raw = object ? string() : null;
          if (object) {
            ws();
            i++; // the colon
          }
          const v = value();
          list.push(object ? { raw, start: at, end: v.end, value: v } : v);
          ws();
          if (text[i++] !== ',') break;
        }
      } else i++;
      return object ? { type: 'object', start, end: i, members: list } : { type: 'array', start, end: i, items: list };
    }
    if (ch === '"') string();
    else while (i < text.length && !`,]}${WS}`.includes(text[i])) i++;
    return { type: 'scalar', start, end: i };
  };
  return value();
}

/** SD34: in a walked object no key appears twice and no key's raw text holds a backslash. */
const keysOk = (node) => {
  const raws = node.members.map((m) => m.raw);
  return new Set(raws).size === raws.length && raws.every((r) => !r.includes('\\'));
};
const member = (node, key) => node.members.find((m) => m.raw === key) ?? null;

/** BR7.12: the walk over the hooks path, refusing what the app does not change. */
function walkHooks(tree) {
  if (tree.type !== 'object' || !keysOk(tree)) return { reason: 'unexpectedShape' };
  const hooks = member(tree, 'hooks');
  if (!hooks) return { hooks: null };
  if (hooks.value.type !== 'object' || !keysOk(hooks.value)) return { reason: 'unexpectedShape' };
  for (const event of hooks.value.members) {
    if (event.value.type !== 'array') return { reason: 'unexpectedShape' };
    for (const group of event.value.items) {
      if (group.type !== 'object' || !keysOk(group)) return { reason: 'unexpectedShape' };
      const inner = member(group, 'hooks');
      if (!inner || inner.value.type !== 'array') return { reason: 'unexpectedShape' };
      if (inner.value.items.some((h) => h.type !== 'object' || !keysOk(h))) return { reason: 'unexpectedShape' };
    }
  }
  return { hooks };
}

/**
 * US-0506 u4 SD34: reads a settings file's bytes. Refuses invalid UTF-8, a parse failure (invalidJson) and the shapes of
 * BR7.12 (unexpectedShape); otherwise `{ text, bom, value, tree, hooks }`, with `text` without its leading BOM.
 */
export function readSettings(bytes) {
  const decoded = bytes.toString('utf8');
  if (!Buffer.from(decoded, 'utf8').equals(bytes)) return { reason: 'invalidJson' };
  const bom = decoded.startsWith('﻿');
  const text = bom ? decoded.slice(1) : decoded;
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return { reason: 'invalidJson' };
  }
  if (!isObject(value)) return { reason: 'unexpectedShape' };
  const tree = scan(text);
  const walked = walkHooks(tree);
  if (walked.reason) return { reason: walked.reason };
  return { text, bom, value, tree, hooks: walked.hooks };
}

/** Every app hook of a parsed settings value, in file order, with its position. */
function appHooks(value) {
  const out = [];
  for (const [event, groups] of Object.entries(value.hooks ?? {}))
    groups.forEach((group, g) =>
      group.hooks.forEach((hook, h) => {
        const kind = appKind(hook?.command);
        if (kind) out.push({ event, g, h, kind, group, hook });
      })
    );
  return out;
}

const canonicalHook = (e) => ({ type: 'command', command: e.command, timeout: e.timeout, ...(e.async ? { async: true } : {}) });
const canonicalGroup = (e) => ({ ...(e.matcher !== undefined ? { matcher: e.matcher } : {}), hooks: [canonicalHook(e)] });
const sameAs = (app, e) => app.event === e.event && app.group.matcher === e.matcher && isDeepStrictEqual(app.hook, canonicalHook(e));

/** The status of one file from its parts' statuses (BR7.5). */
export function combine(statuses) {
  if (statuses.every((s) => s === 'missing')) return 'missing';
  if (statuses.every((s) => s === 'current')) return 'current';
  return statuses.includes('editedByHand') ? 'editedByHand' : 'outOfDate';
}

/** US-0506 u4 BR7.4–BR7.6: each app hook's status, each kind's, and the settings file's. */
export function classify(value, releases = RELEASES) {
  const current = releases.at(-1);
  const earlier = releases.slice(0, -1);
  const apps = appHooks(value).map((a) => {
    const e = current.entries[a.kind];
    // An earlier release may not have this kind at all (US-0213).
    const status = sameAs(a, e) ? 'current' : earlier.some((r) => r.entries[a.kind] && sameAs(a, r.entries[a.kind])) ? 'outOfDate' : 'editedByHand';
    return { ...a, status };
  });
  const kinds = {};
  for (const k of KINDS) {
    const mine = apps.filter((a) => a.kind === k);
    if (mine.length > 1) for (const a of mine) a.status = 'editedByHand'; // BR7.6
    kinds[k] = mine.length === 0 ? 'missing' : mine[0].status;
  }
  return { status: combine(Object.values(kinds)), kinds, apps };
}

/** A copy of the value without the app's hooks (SD34). */
export function stripApp(value) {
  const copy = structuredClone(value);
  for (const groups of Object.values(copy.hooks ?? {})) for (const group of groups) group.hooks = group.hooks.filter((h) => !appKind(h?.command));
  return copy;
}

/** Inside hooks only: groups with no hook, empty event arrays and an empty hooks object go (SD34). */
export function prune(value) {
  const copy = structuredClone(value);
  if (!isObject(copy.hooks)) return copy;
  for (const [event, groups] of Object.entries(copy.hooks)) {
    copy.hooks[event] = groups.filter((g) => g.hooks.length > 0);
    if (copy.hooks[event].length === 0) delete copy.hooks[event];
  }
  if (Object.keys(copy.hooks).length === 0) delete copy.hooks;
  return copy;
}

/** The file's own line end and indent unit (SD34). */
function style(text) {
  const eol = /\r?\n/.exec(text)?.[0] ?? '\n';
  const unit = /\n([ \t]+)\S/.exec(text)?.[1] ?? '  ';
  return { eol, unit };
}
const format = (value, depth, { eol, unit }) =>
  JSON.stringify(value, null, unit)
    .split('\n')
    .join(eol + unit.repeat(depth));
const memberText = (key, value, depth, st) => `${JSON.stringify(key)}: ${format(value, depth, st)}`;

/** Edits that remove `gone` from `list`, each with its separator, while at least one element stays (RD37). */
function removeFrom(list, gone) {
  return list.flatMap((el, i) => {
    if (!gone.has(el)) return [];
    const keptBefore = list.slice(0, i).some((x) => !gone.has(x));
    return [keptBefore ? { start: list[i - 1].end, end: el.end, text: '' } : { start: el.start, end: list[i + 1].start, text: '' }];
  });
}

/** One edit that appends element texts at the end of a container at `depth` (RD36). */
function appendTo(node, list, texts, depth, st) {
  const pad = st.eol + st.unit.repeat(depth + 1);
  if (list.length) return { start: list.at(-1).end, end: list.at(-1).end, text: texts.map((t) => `,${pad}${t}`).join('') };
  return { start: node.start + 1, end: node.end - 1, text: `${pad}${texts.join(`,${pad}`)}${st.eol}${st.unit.repeat(depth)}` };
}

/** The edits for one action over a read file, with whether any of them replaces a hand edit (BR7.8, BR7.10, BR7.19). */
function plan(read, action, releases) {
  const st = style(read.text);
  const { apps, kinds } = classify(read.value, releases);
  const entries = releases.at(-1).entries;
  const hooksObj = read.hooks?.value ?? null;
  const nodeOf = (a) => member(member(hooksObj, a.event).value.items[a.g], 'hooks').value.items[a.h];
  const gone = new Set();
  const replace = new Map();
  const append = new Map(); // event -> [kind]
  let replacesHandEdit = false;
  if (action === 'remove') for (const a of apps) gone.add(nodeOf(a));
  else
    for (const k of KINDS) {
      const e = entries[k];
      const mine = apps.filter((a) => a.kind === k);
      const keeper = mine.find((a) => a.event === e.event && a.group.matcher === e.matcher);
      for (const a of mine) if (a !== keeper) gone.add(nodeOf(a));
      if (keeper && !isDeepStrictEqual(keeper.hook, canonicalHook(e))) replace.set(nodeOf(keeper), format(canonicalHook(e), 5, st));
      if (!keeper) append.set(e.event, [...(append.get(e.event) ?? []), k]);
      if (kinds[k] === 'editedByHand' && (mine.length > 1 || !keeper || replace.has(nodeOf(keeper)))) replacesHandEdit = true;
    }

  const edits = [];
  const keptEvents = [];
  const goneEvents = new Set();
  for (const event of hooksObj?.members ?? []) {
    const own = [];
    const goneGroups = new Set();
    for (const group of event.value.items) {
      const inner = member(group, 'hooks').value.items;
      const removed = new Set(inner.filter((h) => gone.has(h)));
      if (removed.size && removed.size === inner.length) goneGroups.add(group);
      else {
        own.push(...removeFrom(inner, removed));
        for (const h of inner) if (replace.has(h)) own.push({ start: h.start, end: h.end, text: replace.get(h) });
      }
    }
    const groups = event.value.items;
    const added = (append.get(event.raw) ?? []).map((k) => format(canonicalGroup(entries[k]), 3, st));
    append.delete(event.raw);
    const left = groups.length - goneGroups.size;
    if (goneGroups.size && left === 0 && !added.length) goneEvents.add(event);
    else {
      keptEvents.push(event);
      if (goneGroups.size && left === 0) own.push({ ...appendTo(event.value, [], added, 2, st) });
      else {
        own.push(...removeFrom(groups, goneGroups));
        if (added.length) own.push(appendTo(event.value, groups, added, 2, st));
      }
      edits.push(...own);
    }
  }
  const newEvents = KINDS.map((k) => entries[k].event)
    .filter((ev, i, all) => append.has(ev) && all.indexOf(ev) === i)
    .map((ev) =>
      memberText(
        ev,
        append.get(ev).map((k) => canonicalGroup(entries[k])),
        2,
        st
      )
    );

  const root = read.tree;
  if (hooksObj) {
    if (goneEvents.size && keptEvents.length === 0 && !newEvents.length) {
      edits.length = 0; // the hooks member goes as a whole
      const rest = root.members.filter((m) => m !== read.hooks);
      edits.push(...(rest.length ? removeFrom(root.members, new Set([read.hooks])) : [{ start: root.start + 1, end: root.end - 1, text: '' }]));
    } else if (goneEvents.size && keptEvents.length === 0) {
      edits.length = 0;
      edits.push(appendTo(hooksObj, [], newEvents, 1, st));
    } else {
      edits.push(...removeFrom(hooksObj.members, goneEvents));
      if (newEvents.length) edits.push(appendTo(hooksObj, hooksObj.members, newEvents, 1, st));
    }
  } else if (newEvents.length) {
    const obj = Object.fromEntries(
      KINDS.map((k) => entries[k].event).map((ev) => [ev, KINDS.filter((k) => entries[k].event === ev).map((k) => canonicalGroup(entries[k]))])
    );
    edits.push(appendTo(root, root.members, [memberText('hooks', obj, 1, st)], 0, st));
  }
  return { edits, replacesHandEdit };
}

/** Applies non-overlapping edits from the end, so earlier offsets stay valid. */
function applyEdits(text, edits) {
  const sorted = [...edits].sort((a, b) => b.start - a.start || b.end - a.end);
  sorted.forEach((e, i) => {
    if (i > 0 && e.end > sorted[i - 1].start) throw new Error('overlapping splices');
  });
  return sorted.reduce((out, e) => out.slice(0, e.start) + e.text + out.slice(e.end), text);
}

const CONTEXT = 3;
const stripCr = (line) => line.replace(/\r$/, '');

/** D5: each splice becomes a hunk with signed lines and up to 3 lines of context; close ones share a hunk. */
function diffFromEdits(text, edits) {
  const lines = text.split('\n');
  const starts = [];
  lines.reduce((at, l) => (starts.push(at), at + l.length + 1), 0);
  const lineOf = (pos) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const last = text.endsWith('\n') ? lines.length - 2 : lines.length - 1;
  const blocks = [];
  for (const e of [...edits].sort((a, b) => a.start - b.start)) {
    const a = lineOf(e.start);
    const b = lineOf(Math.max(e.start, e.end - 1));
    const prev = blocks.at(-1);
    if (prev && a <= prev.b) {
      prev.b = Math.max(prev.b, b);
      prev.edits.push(e);
    } else blocks.push({ a, b, edits: [e] });
  }
  const out = [];
  let delta = 0;
  for (let i = 0; i < blocks.length;) {
    let j = i;
    while (j + 1 < blocks.length && blocks[j + 1].a - blocks[j].b - 1 <= 2 * CONTEXT) j++;
    const from = Math.max(0, blocks[i].a - CONTEXT);
    const to = Math.min(last, blocks[j].b + CONTEXT);
    const body = [];
    let oldCount = 0;
    let newCount = 0;
    let line = from;
    const context = (upTo) => {
      for (; line < upTo; line++, oldCount++, newCount++) body.push(` ${stripCr(lines[line])}`);
    };
    for (const block of blocks.slice(i, j + 1)) {
      context(block.a);
      const segStart = starts[block.a];
      const segEnd = starts[block.b] + lines[block.b].length;
      const seg = text.slice(segStart, segEnd);
      const next = applyEdits(
        seg,
        block.edits.map((e) => ({ ...e, start: e.start - segStart, end: e.end - segStart }))
      );
      const oldLines = seg.split('\n').map(stripCr);
      const newLines = next.split('\n').map(stripCr);
      // Lines the splice leaves equal at either end of the block are context, so an append is only + lines
      // and a removal only - lines (W5).
      let p = 0;
      while (p < oldLines.length && p < newLines.length && oldLines[p] === newLines[p]) p++;
      let s = 0;
      while (s < oldLines.length - p && s < newLines.length - p && oldLines.at(-1 - s) === newLines.at(-1 - s)) s++;
      body.push(
        ...oldLines.slice(0, p).map((l) => ` ${l}`),
        ...oldLines.slice(p, oldLines.length - s).map((l) => `-${l}`),
        ...newLines.slice(p, newLines.length - s).map((l) => `+${l}`),
        ...oldLines.slice(oldLines.length - s).map((l) => ` ${l}`)
      );
      oldCount += oldLines.length;
      newCount += newLines.length;
      line = block.b + 1;
    }
    context(to + 1);
    out.push(`@@ -${from + 1},${oldCount} +${from + 1 + delta},${newCount} @@`, ...body);
    delta += newCount - oldCount;
    i = j + 1;
  }
  return out.join('\n');
}

/** D5: a whole-file create, delete or replace: every old line `-`, then every new line `+`. */
export function wholeDiff(oldText, newText) {
  const split = (t) => (t === '' ? [] : t.replace(/\n$/, '').split('\n').map(stripCr));
  const o = split(oldText);
  const n = split(newText);
  return [`@@ -${o.length ? 1 : 0},${o.length} +${n.length ? 1 : 0},${n.length} @@`, ...o.map((l) => `-${l}`), ...n.map((l) => `+${l}`)].join('\n');
}

/**
 * prune hides empty containers, so this checks them on their own (review iteration 1): a hooks object, an event array
 * or groups that were empty before stay, with the same number of empty groups per event. An app append may fill an
 * empty hooks object or event array; removing the app's entries never leaves an empty group behind.
 */
function emptiesKept(oldValue, nextValue) {
  const oldHooks = isObject(oldValue.hooks) ? oldValue.hooks : null;
  const nextHooks = isObject(nextValue.hooks) ? nextValue.hooks : {};
  const emptyGroups = (groups) => (groups ?? []).filter((g) => g.hooks.length === 0).length;
  if (oldHooks && !isObject(nextValue.hooks) && Object.keys(oldHooks).length === 0) return false;
  for (const [event, groups] of Object.entries(oldHooks ?? {})) if (groups.length === 0 && !Array.isArray(nextHooks[event])) return false;
  const events = new Set([...Object.keys(oldHooks ?? {}), ...Object.keys(nextHooks)]);
  return [...events].every((event) => emptyGroups(oldHooks?.[event]) === emptyGroups(nextHooks[event]));
}

/**
 * US-0506 u4 SD34: the spliced bytes must read back, keep the BOM as found, leave every non-app value equal, and hold
 * exactly one current entry per kind (install, update) or none of the app's (remove). Returns null or 'unexpectedShape'.
 */
export function postCheck(oldBytes, nextBytes, action, releases = RELEASES) {
  const old = oldBytes ? readSettings(oldBytes) : { value: {}, bom: false };
  const next = readSettings(nextBytes);
  if (old.reason || next.reason || next.bom !== old.bom) return 'unexpectedShape';
  if (!isDeepStrictEqual(prune(stripApp(next.value)), prune(stripApp(old.value)))) return 'unexpectedShape';
  if (!emptiesKept(old.value, next.value)) return 'unexpectedShape';
  const c = classify(next.value, releases);
  const ok = action === 'remove' ? c.apps.length === 0 : KINDS.every((k) => c.kinds[k] === 'current');
  return ok ? null : 'unexpectedShape';
}

/**
 * US-0506 u4 BR7.10, BR7.11, BR7.19: the settings file after `action`. `bytes` null is an absent file. Returns
 * `{ change: 'create'|'modify'|'none', bytes, diff, replacesHandEdit }` or `{ reason }`; the text is never re-serialised.
 */
export function splice(bytes, action, releases = RELEASES) {
  const entries = releases.at(-1).entries;
  const none = { change: 'none', bytes, diff: '', replacesHandEdit: false };
  if (bytes === null) {
    if (action === 'remove') return none;
    const obj = Object.fromEntries(KINDS.map((k) => [entries[k].event, [canonicalGroup(entries[k])]]));
    const next = Buffer.from(`${format({ hooks: obj }, 0, { eol: '\n', unit: '  ' })}\n`, 'utf8');
    const reason = postCheck(null, next, action, releases);
    return reason ? { reason } : { change: 'create', bytes: next, diff: wholeDiff('', next.toString('utf8')), replacesHandEdit: false };
  }
  const read = readSettings(bytes);
  if (read.reason) return { reason: read.reason };
  let planned;
  let text;
  try {
    planned = plan(read, action, releases);
    if (!planned.edits.length) return none;
    text = applyEdits(read.text, planned.edits);
  } catch {
    return { reason: 'unexpectedShape' };
  }
  const next = Buffer.from(`${read.bom ? '﻿' : ''}${text}`, 'utf8');
  const reason = postCheck(bytes, next, action, releases);
  if (reason) return { reason };
  return { change: 'modify', bytes: next, diff: diffFromEdits(read.text, planned.edits), replacesHandEdit: planned.replacesHandEdit };
}

// ---------------------------------------------------------------------------------------------------------------
// HookInstaller (LC30).

const BUNDLED = { script: () => SCRIPT_BYTES, plugin: () => PLUGIN_BYTES };
const DIGEST = { script: 'scriptDigest', plugin: 'pluginDigest' };
// RD34: folders a remove tries to take away afterwards, deepest first, only when empty.
const REMOVE_DIRS = { claude: ['.thadeus/hooks', '.thadeus'], opencode: ['.opencode/plugins'] };
const codeError = (code, reason) => Object.assign(new Error(code), { code, reason });

/** The digest of a file now, null when absent. Only ENOENT means absent; every other error is thrown. */
async function digestAt(abs) {
  try {
    return sha256(await fs.readFile(abs));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/** RD34: the files an apply writes, in an order that never leaves an entry without its script. */
function writeOrder(pv) {
  const order = pv.action === 'remove' ? ['settings', 'script', 'plugin'] : ['script', 'settings', 'plugin'];
  return order.map((key) => pv.files.find((f) => f.key === key)).filter((f) => f && f.change !== 'none');
}

/** The summary line of a preview file (BR7.7); the renderer adds the hand-edit sentence from replacesHandEdit (BR7.8). */
const summaryOf = (f) => t(`agentHooks.summary.${f.key === 'settings' && f.change === 'modify' ? 'settingsModify' : f.change}`);

/**
 * US-0506 u4 LC30: status, preview, apply and cancel per open project, and isCurrent for the source choice (C5).
 * @param {{log?: (line: string) => void, onStatus?: (s: {projectId, root, harnesses, previous}) => void,
 *   usedOf?: (projectId: string) => string[]|Promise<string[]>, releases?: object[], watch?: typeof watchFiles}} deps
 *   onStatus: every status change, after open, apply or a change on disk (BR7.17); usedOf: the harnesses the project
 *   uses (BR7.15); watch: the watcher, a fake in tests
 */
export function createHookInstaller({ log = console.warn, onStatus = () => {}, usedOf = () => [], releases = RELEASES, watch = watchFiles } = {}) {
  const projects = new Map(); // projectId -> { id, root, previews, chain, watcher, last, lastKey }
  const current = new Map(); // `${root}\0${harness}` -> boolean (PD30)
  const say = (line) => log(`[agent-hooks] ${line}`);

  const project = (projectId) => {
    const p = projects.get(projectId);
    if (!p) throw new Error(t('errors.unknownProject', { id: String(projectId) }));
    return p;
  };

  /** One file as it is on disk: its status (BR7.4) or reason (RD39), and the bytes a preview builds on. */
  async function readState(root, key) {
    const rel = FILES[key];
    const chk = await checkPath(root, rel);
    if (chk.reason) return { key, rel, status: 'missing', reason: chk.reason, ...(chk.cause ? { cause: chk.cause } : {}) };
    if (!chk.exists) return { key, rel, abs: chk.abs, status: 'missing', bytes: null, missingDirs: chk.missingDirs };
    let bytes;
    try {
      bytes = await fs.readFile(chk.abs);
    } catch (err) {
      return { key, rel, status: 'missing', reason: 'cannotRead', cause: err.code };
    }
    const base = { key, rel, abs: chk.abs, bytes, missingDirs: [] };
    if (key !== 'settings') {
      const digest = sha256(bytes);
      const status = digest === releases.at(-1)[DIGEST[key]] ? 'current' : releases.some((r) => r[DIGEST[key]] === digest) ? 'outOfDate' : 'editedByHand';
      return { ...base, status };
    }
    const read = readSettings(bytes);
    return read.reason ? { key, rel, status: 'missing', reason: read.reason } : { ...base, status: classify(read.value, releases).status };
  }

  /** The C4 status payload: one entry per harness (BR7.5); a file with a reason keeps its harness missing. */
  async function compute(p) {
    const used = new Set(await usedOf(p.id));
    const states = await Promise.all(Object.keys(FILES).map((key) => readState(p.root, key)));
    const byKey = Object.fromEntries(states.map((s) => [s.key, s]));
    return Object.entries(HARNESS_FILES).map(([harness, keys]) => {
      const files = keys.map((k) => {
        const s = byKey[k];
        return { path: s.rel, status: s.status, ...(s.reason ? { reason: s.reason } : {}), ...(s.cause ? { cause: s.cause } : {}) };
      });
      const status = files.some((f) => f.reason) ? 'missing' : combine(files.map((f) => f.status));
      return { harness, used: used.has(harness), status, files };
    });
  }

  /** BR7.17, PD32: recompute from disk; on a change, update isCurrent and tell onStatus. Never writes. */
  async function publish(p) {
    const harnesses = await compute(p);
    if (projects.get(p.id) !== p) return harnesses; // closed meanwhile
    const key = JSON.stringify(harnesses);
    if (key !== p.lastKey) {
      const previous = p.last;
      p.last = harnesses;
      p.lastKey = key;
      for (const h of harnesses) current.set(`${p.root}\0${h.harness}`, h.status === 'current');
      onStatus({ projectId: p.id, root: p.root, harnesses, previous });
    }
    return harnesses;
  }

  /** BR7.7, SD31, SD33: builds and stores a preview; the result holds only what the renderer shows. */
  async function build(p, harness, action) {
    const states = await Promise.all(HARNESS_FILES[harness].map((key) => readState(p.root, key)));
    const bad = states.find((s) => s.reason);
    if (bad) return { refusal: bad.reason, file: bad.rel, ...(bad.cause ? { cause: bad.cause } : {}) };
    const files = [];
    for (const s of states) {
      let out;
      if (s.key === 'settings') {
        out = splice(s.bytes, action, releases);
        if (out.reason) return { refusal: out.reason, file: s.rel };
      } else {
        const next = BUNDLED[s.key]();
        const oldText = s.bytes ? s.bytes.toString('utf8') : '';
        if (action === 'remove') out = s.bytes ? { change: 'delete', bytes: null, diff: wholeDiff(oldText, '') } : { change: 'none', bytes: null, diff: '' };
        else if (!s.bytes) out = { change: 'create', bytes: next, diff: wholeDiff('', next.toString('utf8')) };
        else if (s.bytes.equals(next)) out = { change: 'none', bytes: next, diff: '' };
        else out = { change: 'modify', bytes: next, diff: wholeDiff(oldText, next.toString('utf8')), replacesHandEdit: s.status === 'editedByHand' };
      }
      const mode = out.change === 'modify' ? (await fs.stat(s.abs)).mode & 0o7777 : undefined;
      const f = {
        key: s.key,
        rel: s.rel,
        change: out.change,
        baseDigest: s.bytes ? sha256(s.bytes) : null,
        nextBytes: out.bytes,
        mode,
        missingDirs: s.missingDirs
      };
      f.replacesHandEdit = out.replacesHandEdit === true;
      f.diff = out.diff;
      f.summary = summaryOf(f);
      files.push(f);
    }
    for (const [id, old] of p.previews) if (old.harness === harness && old.state === 'open') p.previews.delete(id); // superseded
    const previewId = randomUUID();
    p.previews.set(previewId, { id: previewId, harness, action, files, state: 'open' });
    return {
      previewId,
      harness,
      action,
      canApply: files.some((f) => f.change !== 'none'),
      files: files.map((f) => ({ path: f.rel, change: f.change, summary: f.summary, diff: f.diff, replacesHandEdit: f.replacesHandEdit }))
    };
  }

  /** RD33, RD35: one file; the last read and compare sits directly before the rename or unlink. */
  async function writeOne(root, f, created) {
    const chk = await checkPath(root, f.rel);
    if (chk.reason) throw codeError(chk.cause ?? chk.reason, chk.reason);
    const finalCompare = async () => {
      if ((await digestAt(chk.abs)) !== f.baseDigest) throw codeError('changedSincePreview');
    };
    if (f.change === 'delete') {
      await finalCompare();
      await fs.unlink(chk.abs);
      return;
    }
    for (const dir of chk.missingDirs) {
      await fs.mkdir(path.join(root, dir));
      created.push(dir);
    }
    await writeAtomic(chk.abs, f.nextBytes, { mode: f.mode, expect: finalCompare });
  }

  const rmdirs = async (root, dirs) => {
    for (const dir of dirs) await fs.rmdir(path.join(root, dir)).catch(() => {}); // non-recursive; ENOTEMPTY stays (RD37)
  };

  /** RD40: one apply, its outcome and the preview's end state; the preview always leaves the map. */
  async function run(p, pv) {
    const changed = async (file, result = 'refused') => ({
      result,
      ...(result === 'refused' ? { refusal: 'changedSincePreview' } : { cause: 'changedSincePreview' }),
      file,
      preview: await build(p, pv.harness, pv.action)
    });
    try {
      for (const f of pv.files) {
        const chk = await checkPath(p.root, f.rel);
        if (chk.reason) return { result: 'refused', refusal: chk.reason, file: f.rel, ...(chk.cause ? { cause: chk.cause } : {}) };
        if ((await digestAt(chk.abs)) !== f.baseDigest) return await changed(f.rel); // early exit (RD35)
      }
      const todo = writeOrder(pv);
      if (!todo.length) return { result: 'nothingToChange' };
      for (const [i, f] of todo.entries()) {
        const created = [];
        try {
          await writeOne(p.root, f, created);
        } catch (err) {
          await rmdirs(p.root, [...created].reverse());
          const cause = err.code ?? 'EIO';
          if (i === 0)
            return cause === 'changedSincePreview' ? await changed(f.rel) : { result: 'refused', refusal: err.reason ?? 'cannotWrite', file: f.rel, cause };
          return cause === 'changedSincePreview' ? await changed(f.rel, 'partiallyWritten') : { result: 'partiallyWritten', file: f.rel, cause };
        }
      }
      if (pv.action === 'remove') await rmdirs(p.root, REMOVE_DIRS[pv.harness]);
      return { result: 'written' };
    } catch (err) {
      return { result: 'refused', refusal: 'cannotWrite', cause: err.code ?? 'unexpected' };
    } finally {
      p.previews.delete(pv.id);
    }
  }

  return {
    /** W1: status from disk on open, pushed through onStatus; the three paths are watched from now on (PD32). */
    async openProject(projectId, root) {
      const p = { id: projectId, root, previews: new Map(), chain: Promise.resolve(), watcher: null, last: null, lastKey: null };
      projects.set(projectId, p);
      p.watcher = watch({
        root,
        paths: Object.values(FILES),
        onChange: () => {
          p.chain.then(() => projects.get(projectId) === p && publish(p)).catch((err) => say(`status failed: ${err.code ?? err.message}`));
        },
        onError: (err) => say(`watch failed: ${err.code ?? err.message}`)
      });
      return publish(p);
    },
    /** The project's watcher has started (tests wait on it). */
    ready: (projectId) => project(projectId).watcher?.ready,
    /** SCD31: the watcher closes and the project's previews and isCurrent keys go. */
    async closeProject(projectId) {
      const p = projects.get(projectId);
      if (!p) return;
      projects.delete(projectId);
      for (const h of Object.keys(HARNESS_FILES)) current.delete(`${p.root}\0${h}`);
      await p.watcher?.close();
    },
    has: (projectId) => projects.has(projectId),
    /** C4 agentHooks.status: recomputed from disk. */
    status: async (projectId) => publish(project(projectId)),
    /** Recompute, for example when the project starts using another harness (BR7.15). */
    refresh: async (projectId) => (projects.has(projectId) ? publish(projects.get(projectId)) : null),
    /** C4 agentHooks.preview. */
    preview: async (projectId, harness, action) => build(project(projectId), harness, action),
    /**
     * C4 agentHooks.apply (BR7.9, SD31): the id is checked and set to applying before any await, so a second call
     * finds it no longer open; applies of one project run one after the other on its chain (RD40).
     */
    apply(projectId, previewId) {
      const p = projects.get(projectId);
      const pv = p?.previews.get(previewId);
      if (!pv || pv.state !== 'open') return Promise.resolve({ result: 'refused', refusal: 'previewUnknown' });
      pv.state = 'applying';
      const job = p.chain.then(async () => {
        const out = await run(p, pv);
        say(
          `${pv.harness} ${pv.action}: ${out.result}${out.refusal ? ` ${out.refusal}` : ''}${out.file ? ` ${out.file}` : ''}${out.cause ? ` (${out.cause})` : ''}`
        );
        return { ...out, status: await publish(p) };
      });
      p.chain = job.catch(() => {});
      return job;
    },
    /** C4 agentHooks.cancel (SD31): an open preview ends in main. */
    cancel(projectId, previewId) {
      const p = projects.get(projectId);
      if (p?.previews.get(previewId)?.state === 'open') p.previews.delete(previewId);
    },
    /** C5 (PD30): from memory, no I/O; false for an unknown root or harness. */
    isCurrent: (root, harness) => current.get(`${root}\0${harness}`) === true
  };
}

// ---------------------------------------------------------------------------------------------------------------
// IpcRouter additions (LC34).

const PREVIEW_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const invalid = (what, value) => new Error(t('errors.invalidValue', { what, value: String(value) }));

/**
 * US-0506 u4 SD32: the four C4 handlers, each with an exact positional argument list checked before any file is read.
 * The renderer names only a project, a harness, an action and a preview id, never a path (BR7.13).
 */
export function hooksHandlers(installer) {
  const args = (list, n) => {
    if (list.length !== n) throw invalid('arguments', list.length);
    const [projectId] = list;
    if (typeof projectId !== 'string' || !installer.has(projectId)) throw new Error(t('errors.unknownProject', { id: String(projectId) }));
    return list;
  };
  const previewId = (id) => {
    if (typeof id !== 'string' || !PREVIEW_ID.test(id)) throw invalid('previewId', typeof id === 'string' ? id : typeof id);
    return id;
  };
  return {
    'agentHooks:status': async (_event, ...list) => installer.status(...args(list, 1)),
    'agentHooks:preview': async (_event, ...list) => {
      const [projectId, harness, action] = args(list, 3);
      if (typeof harness !== 'string' || !Object.hasOwn(HARNESS_FILES, harness)) throw invalid('harness', harness);
      if (!ACTIONS.includes(action)) throw invalid('action', action);
      return installer.preview(projectId, harness, action);
    },
    'agentHooks:apply': async (_event, ...list) => {
      const [projectId, id] = args(list, 2);
      return installer.apply(projectId, previewId(id));
    },
    'agentHooks:cancel': async (_event, ...list) => {
      const [projectId, id] = args(list, 2);
      return installer.cancel(projectId, previewId(id));
    }
  };
}

/**
 * US-0506 u4 BR7.17, BR7.18, RD42: the installer's onStatus. Pushes `agent-hooks:changed` to every live window and
 * demotes the harnesses that stopped being current, so their running tabs take the fallback from the next event.
 */
export function statusPusher({ senders, demote }) {
  return ({ projectId, root, harnesses, previous }) => {
    for (const s of senders()) if (!s.isDestroyed()) s.send('agent-hooks:changed', { projectId, harnesses });
    for (const h of harnesses) {
      const before = previous?.find((x) => x.harness === h.harness);
      if (before?.status === 'current' && h.status !== 'current') demote(root, h.harness);
    }
  };
}
