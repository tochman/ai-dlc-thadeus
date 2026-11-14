// Choosing model and effort per agent (EPIC-09 US-0904). One rule table per harness (epic-09 § "Model rules
// per harness"); the command is the same for both: `aidlc config models … --harness claude|opencode`. AI-DLC
// regenerates the agent files itself; the app never edits them. Every argument comes from the tables (NFR4).
import { defaultExec, runFixed } from './exec.js';
import { toolPath } from './tools.js';
import { agentName } from './parsers/ledger.js';
import { APPLIED_EFFORT, CLAUDE_MODELS, EFFORTS, GROUPS, MODEL_WHERE, PRESETS } from '../shared/configTables.js';
import { HARNESSES } from '../shared/harnesses.js';
import { t } from '../shared/i18n.js';

const TIMEOUT_MS = 20000;
const AGENT = /^[a-z][a-z0-9-]{0,63}$/;
const OPENCODE_ID = /^[a-z0-9][a-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const CLAUDE_ID = /^claude-[a-z0-9-]+$/;
const TABLES = new Set(['claude', 'opencode']);

const refuse = (value) => {
  throw new Error(t('errors.invalidValue', { what: 'aidlc config models', value: String(value) }));
};
const errorText = (err) => (err.killed ? t('errors.timeout') : String(err.message ?? err).trim());

/** The effort a harness runs for `effort` (opencode runs xhigh as high); unchanged where it is applied as chosen. */
export function appliedEffort(harness, effort) {
  return APPLIED_EFFORT[harness]?.[effort] ?? effort;
}

/** `opencode models` output -> its `provider/model` ids; anything else on a line is dropped. */
export function parseOpencodeModels(stdout) {
  return String(stdout)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => OPENCODE_ID.test(l));
}

/** Claude's list: inherit and the aliases, plus the full ids `aidlc` already reports as configured. */
function claudeModels(configured) {
  const ids = (configured ?? []).map((e) => e.model).filter((m) => typeof m === 'string' && CLAUDE_ID.test(m));
  return [...new Set([...CLAUDE_MODELS, ...ids])];
}

/**
 * What the model picker may offer for one harness. Never throws: a harness without a rule table, or a failed
 * `opencode models` / `aidlc config models --show`, gives `editable: false` with the reason.
 * @returns {Promise<{harness: string, editable: boolean, reason?: string, models: string[], efforts: string[],
 *   applied: Record<string, string>, configured: object[]}>}
 */
export async function modelOptions(root, harness, { exec = defaultExec } = {}) {
  const base = { harness, models: [], efforts: [...EFFORTS, 'default'], applied: APPLIED_EFFORT[harness] ?? {}, configured: [] };
  const entry = HARNESSES.find((h) => h.id === harness);
  if (!entry) return { ...base, editable: false, reason: t('errors.unknownHarness', { id: String(harness) }) };
  if (entry.perAgentModels === false) return { ...base, editable: false, reason: t('configEdit.models.idePicker', { harness: entry.label }) };
  if (!TABLES.has(harness)) return { ...base, editable: false, reason: t('configEdit.models.noTable', { harness: entry.label }) };
  let configured;
  try {
    const out = JSON.parse(await runFixed(toolPath('aidlc'), ['config', 'models', '--show', '--json', '--harness', harness], { cwd: root, timeout: TIMEOUT_MS, exec }));
    if (out?.ok !== true || !Array.isArray(out.data?.effective)) throw new Error(out?.message ?? t('errors.missingField', { field: 'data.effective' }));
    configured = out.data.effective.filter((e) => e && typeof e.agent === 'string').map((e) => ({ ...e, agent: agentName(e.agent) }));
  } catch (err) {
    console.warn(`aidlc config models --show --harness ${harness} misslyckades:`, errorText(err));
    return { ...base, editable: false, reason: t('configEdit.models.readFailed', { error: errorText(err) }) };
  }
  if (harness === 'claude') return { ...base, editable: true, models: ['default', ...claudeModels(configured)], configured };
  try {
    const ids = parseOpencodeModels(await runFixed(entry.cli, ['models'], { cwd: root, timeout: TIMEOUT_MS, exec }));
    if (!ids.length) throw new Error(t('configEdit.models.noModels'));
    return { ...base, editable: true, models: ['default', 'inherit', ...ids], configured };
  } catch (err) {
    console.warn('opencode models misslyckades:', errorText(err));
    return { ...base, editable: false, reason: t('configEdit.models.readFailed', { error: errorText(err) }), configured };
  }
}

const MODEL_FIELDS = new Set(['harness', 'agent', 'preset', 'group', 'model', 'effort', 'where']);

/** The policy part of the command: exactly one of agent, preset or group (FR1.3). */
function policyArgs({ agent, preset, group, model, effort }, models) {
  const targets = [agent, preset, group].filter((v) => v !== undefined);
  if (targets.length !== 1) refuse('agent|preset|group');
  if (preset !== undefined) {
    if (!PRESETS.includes(preset) || model !== undefined || effort !== undefined) refuse(preset);
    return ['--preset', preset];
  }
  if (group !== undefined) {
    if (!GROUPS.includes(group) || !EFFORTS.includes(effort) || model !== undefined) refuse(group);
    return [`--${group}-effort`, effort];
  }
  if (!AGENT.test(agent)) refuse(agent);
  if (model === undefined && effort === undefined) refuse(agent);
  if (model !== undefined && !models.includes(model)) refuse(model);
  if (effort !== undefined && !EFFORTS.includes(effort) && effort !== 'default') refuse(effort);
  return ['--agent', agent, ...(effort !== undefined ? ['--effort', effort] : []), ...(model !== undefined ? ['--model', model] : [])];
}

/**
 * `aidlc config models … --harness <h> --project|--local` and its --dry-run form. `models` is the harness's list
 * from modelOptions; a model outside it is refused, as is anything outside the tables (NFR4).
 * @returns {{args: string[], dryRunArgs: string[]}}
 */
export function buildModelCommand(change, models) {
  if (!change || typeof change !== 'object' || Array.isArray(change)) refuse(change);
  for (const [k, v] of Object.entries(change)) if (!MODEL_FIELDS.has(k) || (v !== undefined && typeof v !== 'string')) refuse(k);
  if (!TABLES.has(change.harness)) refuse(change.harness);
  if (!MODEL_WHERE.includes(change.where)) refuse(change.where ?? 'where');
  const args = ['config', 'models', ...policyArgs(change, models ?? []), '--harness', change.harness, `--${change.where}`];
  return { args: [...args, '--yes'], dryRunArgs: [...args, '--dry-run'] };
}

async function run(root, args, exec) {
  const command = ['aidlc', ...args].join(' ');
  try {
    return { ok: true, command, output: (await runFixed(toolPath('aidlc'), args, { cwd: root, timeout: TIMEOUT_MS, exec })).trim() };
  } catch (err) {
    console.warn(`${command} misslyckades:`, errorText(err));
    return { ok: false, command, error: errorText(err) };
  }
}

/** Preview: the exact command (the --yes form) and the --dry-run result or its error. */
export async function previewModelChange(root, change, models, { exec = defaultExec } = {}) {
  const { args, dryRunArgs } = buildModelCommand(change, models);
  const res = await run(root, dryRunArgs, exec);
  return { command: ['aidlc', ...args].join(' '), dryRun: res.ok ? res.output : null, ...(res.ok ? {} : { error: res.error }) };
}

export async function applyModelChange(root, change, models, { exec = defaultExec } = {}) {
  return run(root, buildModelCommand(change, models).args, exec);
}

/** `aidlc config models --check`: flags agent files that were edited by hand. Never throws. */
export async function checkDrift(root, harness, { exec = defaultExec } = {}) {
  if (!TABLES.has(harness)) refuse(harness);
  return run(root, ['config', 'models', '--check', '--harness', harness], exec);
}

// The cost estimate. Prices come from this project's own ledger (usd per token per model), so nothing is
// hardcoded; a model the ledger has never used has no price and gives no estimate.

const bare = (m) => String(m).toLowerCase().replace(/^[^/]+\//, '').replace(/^claude-/, '');

/** usd per token for each model in the ledger's byModel rows ({name, usd, totalTokens}). */
export function pricesFromLedger(byModel) {
  return Object.fromEntries((byModel ?? []).filter((r) => r.totalTokens > 0 && r.usd > 0).map((r) => [r.name, r.usd / r.totalTokens]));
}

/** The price for a model id, alias (`opus`) or `provider/model`; the highest-priced match for an alias. */
function priceFor(prices, model) {
  const want = bare(model);
  const hits = Object.entries(prices).filter(([name]) => bare(name) === want || bare(name).startsWith(`${want}-`));
  // ponytail: an alias matching several versions takes the dearest; exact enough for a labelled estimate.
  return hits.length ? Math.max(...hits.map(([, p]) => p)) : null;
}

/** Per-agent ledger rows: {agent, model (the one it ran on most), totalTokens, usd}. */
export function ledgerRows(project) {
  return (project?.byAgent ?? []).map((r) => {
    const agent = agentName(r.name);
    return { agent, model: project.agentModels?.[agent]?.[0] ?? null, totalTokens: r.totalTokens, usd: r.usd };
  });
}

/**
 * How the cost would have changed had `agents` run on `model`, on this project's ledger. Labelled as an
 * estimate; null when a price is unknown or the change sets no model (an effort's effect is not estimated).
 * @returns {{estimate: true, before: number, after: number, delta: number}|null}
 */
export function estimateCost(rows, prices, { agents, model }) {
  if (!model || model === 'default' || model === 'inherit') return null;
  const newPrice = priceFor(prices, model);
  if (newPrice === null) return null;
  const affected = new Set(agents ?? rows.map((r) => r.agent));
  const before = rows.reduce((sum, r) => sum + r.usd, 0);
  let after = 0;
  for (const r of rows) after += affected.has(r.agent) ? r.totalTokens * newPrice : r.usd;
  return { estimate: true, before, after, delta: after - before };
}
