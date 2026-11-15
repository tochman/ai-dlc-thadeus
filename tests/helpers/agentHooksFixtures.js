// US-0506 u4 NFR8.8, RD43: the settings fixtures and temporary projects for the hook installer tests.
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';

export const FIXTURES = path.resolve(__dirname, '../fixtures/agent-hooks');
const REPO = path.resolve(__dirname, '../..');
export const TMP = path.resolve(__dirname, '../.tmp');

const read = (name) => readFileSync(path.join(FIXTURES, name));

/**
 * US-0018: the repository copy holds AI-DLC's hooks only. A checkout where the app's own dialog hooks were
 * installed (entries running `.thadeus/hooks/`) gets them taken out, so the fixture does not depend on the machine.
 * Unchanged bytes when there is nothing to take out.
 */
function aidlcOnly(bytes) {
  const settings = JSON.parse(bytes.toString('utf8'));
  const own = (entry) => entry?.hooks?.some((h) => String(h?.command ?? '').includes('.thadeus/hooks/'));
  let removed = false;
  for (const [event, entries] of Object.entries(settings.hooks ?? {})) {
    if (!Array.isArray(entries) || !entries.some(own)) continue;
    settings.hooks[event] = entries.filter((e) => !own(e));
    if (settings.hooks[event].length === 0) delete settings.hooks[event];
    removed = true;
  }
  return removed ? Buffer.from(`${JSON.stringify(settings, null, 2)}\n`, 'utf8') : bytes;
}

/** The bytes of one fixture; the byte-exact ones and the repository copy are built here (see the README). */
export function fixture(name) {
  switch (name) {
    case 'aidlc.json':
      return aidlcOnly(readFileSync(path.join(REPO, '.claude/settings.json')));
    case 'crlf.json':
      return Buffer.from(read('other-pretooluse.json').toString('utf8').replace(/\n/g, '\r\n'), 'utf8');
    case 'bom.json':
      return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), read('other-pretooluse.json')]);
    case 'no-final-newline.json':
      return Buffer.from(read('no-hooks.json').toString('utf8').replace(/\n$/, ''), 'utf8');
    case 'bad-utf8.json': {
      const text = read('no-hooks.json').toString('latin1');
      return Buffer.from(text.replace('sonnet', 'son\xffnet'), 'latin1');
    }
    case 'escaped-hooks-key.json':
      return Buffer.from('{\n  "\\u0068ooks": {\n    "Stop": []\n  }\n}\n', 'utf8');
    case 'large.json': {
      const text = fixture('aidlc.json').toString('utf8');
      return Buffer.from(`{\n  "padding": "${'x'.repeat(1024 * 1024)}",${text.slice(text.indexOf('{') + 1)}`, 'utf8');
    }
    default:
      return read(name);
  }
}

/** The fixtures an install, update and remove run over (RD43). */
export const INSTALLABLE = [
  'empty-object.json',
  'no-hooks.json',
  'hooks-empty.json',
  'aidlc.json',
  'other-pretooluse.json',
  'indent-4.json',
  'indent-tab.json',
  'crlf.json',
  'bom.json',
  'no-final-newline.json',
  'unknown-keys.json',
  'teammate-other-sh.json',
  'questionx.json',
  'lookalike.json',
  'empty-containers.json'
];

/** A test-only earlier release: question and permission had timeout 300 (earlier-release.json). */
export function testEarlier(canonical) {
  const entries = Object.fromEntries(
    Object.entries(canonical).map(([k, e]) => [k, { ...e, timeout: k === 'question' || k === 'permission' ? 300 : e.timeout }])
  );
  return { release: 'test-earlier', entries, scriptDigest: 'f'.repeat(64), pluginDigest: 'e'.repeat(64) };
}

/** A new empty project folder under tests/.tmp; `settings` (fixture name or bytes) becomes .claude/settings.json. */
export async function tempProject(prefix = 'hooks-', { settings } = {}) {
  await fs.mkdir(TMP, { recursive: true });
  const root = await fs.realpath(await fs.mkdtemp(path.join(TMP, prefix)));
  if (settings) {
    await fs.mkdir(path.join(root, '.claude'), { recursive: true });
    await fs.writeFile(path.join(root, '.claude/settings.json'), typeof settings === 'string' ? fixture(settings) : settings);
  }
  return root;
}

export const removeProject = (root) => fs.rm(root, { recursive: true, force: true });
