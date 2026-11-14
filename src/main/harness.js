// Which harnesses a project has and which CLIs are on the login PATH (EPIC-08 US-0801 FR1).
// Adding a harness: add its entry (markers, CLI, commands) to the table in src/shared/harnesses.js;
// detection, the setting and the pty pick it up from there.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { runFixed } from './exec.js';
import { toolPath } from './tools.js';
import { HARNESSES } from '../shared/harnesses.js';

export { HARNESSES, resolveHarness, selectableHarness } from '../shared/harnesses.js';

const exists = (p, isDir) =>
  fs.stat(p).then(
    (s) => (isDir ? s.isDirectory() : s.isFile()),
    () => false
  );

async function jsonMentionsAidlc(file) {
  try {
    return /aidlc/i.test(await fs.readFile(file, 'utf8'));
  } catch {
    return false; // missing or unreadable: not installed
  }
}

/** True when any of the harness's markers is in `root` (FR1.1). */
async function hasMarkers(root, { dirs = [], files = [], jsonWithAidlc = [] }) {
  const checks = [
    ...dirs.map((d) => exists(path.join(root, d), true)),
    ...files.map((f) => exists(path.join(root, f), false)),
    ...jsonWithAidlc.map((f) => jsonMentionsAidlc(path.join(root, f)))
  ];
  return (await Promise.all(checks)).some(Boolean);
}

/** `<cli> --version` with fixed arguments and runFixed's timeout; any failure counts as not found (FR1.2, FR1.3). */
async function probeCli(cli, root, exec) {
  if (!cli) return null;
  try {
    const out = (await runFixed(toolPath(cli), ['--version'], { cwd: root, exec })).trim();
    return { found: true, version: out.split('\n')[0].slice(0, 80) };
  } catch {
    return { found: false, version: null };
  }
}

/**
 * Every table entry with `installed` (folder markers) and `cli` ({found, version}, or null for a harness
 * without a CLI). All checks run in parallel and never reject (FR1.3). `exec` is injectable for tests.
 * @returns {Promise<Array<{id: string, label: string, selectable: boolean, installed: boolean,
 *   cli: {found: boolean, version: string|null}|null}>>}
 */
export function detectHarnesses(root, { exec } = {}) {
  return Promise.all(
    HARNESSES.map(async (h) => {
      const [installed, cli] = await Promise.all([hasMarkers(root, h.markers), probeCli(h.cli, root, exec)]);
      return { id: h.id, label: h.label, selectable: h.selectable, installed, cli };
    })
  );
}
