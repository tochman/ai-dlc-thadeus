// US-1406 FR4 (contract C4): the first-open choice screen's scan and its one write. The scan only reads (BR4.7, NFR3.1):
// the folder checks are detection's own (`foundFrameworks`), and the tool lookups start nothing (NFR4.1). The only
// write is U2's `writeProjectFile`, after the person confirmed.
import { readLoginPath } from './exec.js';
import { FRAMEWORKS, writeProjectFile } from './projectFile.js';
import { foundFrameworks } from './projectService.js';
import { locateTool } from './tools.js';
import { t } from '../shared/i18n.js';

/** Whether `name` is found on `searchPath` (or at its saved path); a lookup that throws counts as not found (BR4.2). */
async function onPath(name, searchPath, exec) {
  try {
    return (await locateTool(name, { exec, searchPath })) !== null;
  } catch (err) {
    console.warn(`Kunde inte leta upp ${name}:`, err.message);
    return false;
  }
}

/**
 * US-1406 FR4.1, FR4.2 (BR4.2, BR4.3, NFR4.3): what the project has, which tools are on the login PATH (read once, for
 * both lookups) and the proposal: the one framework found, else none. `exec` is injectable for tests.
 * @returns {Promise<{found: {aidlc: boolean, speckit: boolean}, cli: {aidlc: boolean, specify: boolean}, proposal: 'aidlc'|'speckit'|null}>}
 */
export async function frameworkScan(root, { exec } = {}) {
  const [found, read] = await Promise.all([foundFrameworks(root), readLoginPath(exec)]);
  const [a, s] = await Promise.all([onPath('aidlc', read.path, exec), onPath('specify', read.path, exec)]);
  const only = FRAMEWORKS.filter((f) => found[f]);
  return { found, cli: { aidlc: a, specify: s }, proposal: only.length === 1 ? only[0] : null };
}

const SETUP = { aidlc: 'setupAidlc', speckit: 'setupSpeckit' };

/**
 * US-1406 FR4.2, FR4.3 (BR4.5, BR4.6, BR4.8, NFR3.2, NFR4.2): saves the confirmed framework. An unknown one is refused
 * before any file access. One whose folder is missing writes nothing and names its setup; a found one is written through
 * U2's atomic write, whose refusal becomes a rejection with its translated message.
 * @returns {Promise<{ok: true, file: string|null, next: 'none'|'setupAidlc'|'setupSpeckit'}>}
 */
export async function chooseFramework(root, framework) {
  if (!FRAMEWORKS.includes(framework)) throw new Error(t('projectFile.errors.invalidFramework'));
  const found = await foundFrameworks(root);
  if (!found[framework]) return { ok: true, file: null, next: SETUP[framework] };
  const res = await writeProjectFile(root, framework);
  if (!res.ok) throw new Error(res.error.message);
  return { ok: true, file: res.file, next: 'none' };
}
