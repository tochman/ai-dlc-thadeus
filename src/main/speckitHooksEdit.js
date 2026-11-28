// US-0906 FR2.3, FR3.1, FR3.3, FR4.1: preview and safely apply Spec Kit hook edits.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { resolveInRoot } from './projectAccess.js';
import { checkHookEdit, SPECKIT_SPINE } from '../shared/planDesign.js';

const EXTENSIONS_FILE = '.specify/extensions.yml';
const safeName = /^[a-z0-9][a-z0-9._-]{0,99}$/;

function extensionIds(document) {
  const installed = document.get('installed');
  if (!YAML.isSeq(installed)) return [];
  return installed.items.map((item) => (YAML.isMap(item) ? item.get('id') : item?.value)).filter((id) => typeof id === 'string');
}

function validate(edit, document) {
  const checked = checkHookEdit({ ...edit, extensions: extensionIds(document) });
  if (!checked.ok) throw new Error(`Spec Kit hook edit refused: ${checked.reason}`);
  if (!['add', 'remove'].includes(edit.action)) throw new Error('Spec Kit hook edit refused: unsupportedAction');
  if (!safeName.test(edit.extension)) throw new Error('Spec Kit hook edit refused: unsafeExtension');
}

function editDocument(document, edit) {
  const key = `${edit.when}_${edit.target}`;
  const hooks = document.get('hooks', true);
  if (!hooks || !YAML.isMap(hooks)) document.set('hooks', document.createNode({}));
  const hookMap = document.get('hooks', true);
  const existing = hookMap.get(key, true);
  const entries = existing === undefined ? [] : YAML.isSeq(existing) ? existing.items : [existing];
  const matches = (entry) => entry?.get?.('extension') === edit.extension && entry?.get?.('command') === edit.command;

  if (edit.action === 'remove') {
    const next = entries.filter((entry) => !matches(entry));
    if (next.length === 0) hookMap.delete(key);
    else hookMap.set(key, document.createNode(next));
    return;
  }

  const next = entries.filter((entry) => !matches(entry));
  next.push({
    extension: edit.extension,
    command: edit.command,
    ...(edit.mode === 'mandatory' ? { optional: false } : {}),
    ...(edit.mode === 'off' ? { enabled: false } : {})
  });
  hookMap.set(key, document.createNode(next));
}

async function readCurrent(root) {
  const realRoot = await fs.realpath(root);
  try {
    const file = await resolveInRoot(realRoot, EXTENSIONS_FILE);
    if (!(await fs.stat(file)).isFile()) throw new Error('Spec Kit extension configuration is not a file.');
    return { file, before: await fs.readFile(file, 'utf8') };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const directory = await resolveInRoot(realRoot, '.specify');
    return { file: path.join(directory, 'extensions.yml'), before: '' };
  }
}

function createNext(before, edit) {
  const document = YAML.parseDocument(before || '{}');
  if (document.errors.length) throw new Error(`Spec Kit extension configuration is invalid YAML: ${document.errors[0].message}`);
  if (!YAML.isMap(document.contents)) throw new Error('Spec Kit extension configuration must be a YAML mapping.');
  validate(edit, document);
  editDocument(document, edit);
  return document.toString();
}

function diffText(before, next) {
  const oldLines = before.trimEnd().split('\n');
  const newLines = next.trimEnd().split('\n');
  return [...oldLines.map((line) => `- ${line}`), ...newLines.map((line) => `+ ${line}`)].join('\n');
}

/** US-0906 FR3.1: return a diff without writing the Spec Kit extension file. */
export async function previewHookEdit(root, edit) {
  const { before } = await readCurrent(root);
  const next = createNext(before, edit);
  return { file: EXTENSIONS_FILE, before, next, diff: diffText(before, next) };
}

/** US-0906 FR3.3, FR4.1: apply only the previewed content and refuse external edits. */
export async function applyHookEdit(root, edit, before) {
  const current = await readCurrent(root);
  if (typeof before !== 'string' || current.before !== before) throw new Error(`Spec Kit file changed since preview: ${EXTENSIONS_FILE}`);
  const next = createNext(current.before, edit);
  await fs.writeFile(current.file, next, 'utf8');
  return { file: EXTENSIONS_FILE, ok: true };
}

export { SPECKIT_SPINE };
