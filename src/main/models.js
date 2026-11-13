// Configured model per AI-DLC agent. Primary source: `aidlc config models` (fixed arguments,
// execFile without a shell). Fallback: the `model:` frontmatter of .claude/agents/aidlc-*-agent.md (FR4.1, FR4.2).
import { defaultExec, runFixed } from './exec.js';
import { listDir, readText } from './projectAccess.js';
import { agentName } from './parsers/ledger.js';
import { t } from '../shared/i18n.js';

const AIDLC_ARGS = ['config', 'models', '--show', '--json', '--harness', 'claude'];
const AIDLC_TIMEOUT_MS = 10000;
const AGENTS_DIR = '.claude/agents';
const AGENT_FILE = /^aidlc-.+-agent\.md$/;

function parseAidlcOutput(stdout) {
  const out = JSON.parse(stdout);
  const effective = out?.data?.effective;
  if (out?.ok !== true || !Array.isArray(effective)) throw new Error(t('errors.missingField', { field: 'data.effective' }));
  return effective
    .filter((e) => e && typeof e.agent === 'string')
    .map((e) => ({ agent: agentName(e.agent), model: e.model ?? null, effort: e.effort ?? null }));
}

function frontmatterField(text, field) {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const m = fm && new RegExp(`^${field}:\\s*(.+?)\\s*$`, 'm').exec(fm[1]);
  return m ? m[1].replace(/^['"]|['"]$/g, '') : null;
}

async function readAgentFiles(root) {
  const files = (await listDir(root, AGENTS_DIR)).filter((e) => !e.isDir && AGENT_FILE.test(e.name));
  const agents = [];
  for (const f of files) {
    try {
      const text = await readText(root, `${AGENTS_DIR}/${f.name}`);
      agents.push({
        agent: agentName(f.name.replace(/\.md$/, '')),
        model: frontmatterField(text, 'model'),
        effort: frontmatterField(text, 'effort')
      });
    } catch (err) {
      console.warn(`Kunde inte läsa ${AGENTS_DIR}/${f.name}:`, err.message);
    }
  }
  return agents.sort((a, b) => a.agent.localeCompare(b.agent));
}

/**
 * Never throws (NFR3). `exec(file, args, options) => Promise<stdout>` is injectable for tests.
 * @returns {Promise<{source: 'aidlc-config'|'agent-files'|'none', agents: {agent: string, model: string|null, effort: string|null}[], error?: string}>}
 */
export async function getConfiguredModels(root, { exec = defaultExec } = {}) {
  let error;
  try {
    const stdout = await runFixed('aidlc', AIDLC_ARGS, { cwd: root, timeout: AIDLC_TIMEOUT_MS, exec });
    return { source: 'aidlc-config', agents: parseAidlcOutput(stdout) };
  } catch (err) {
    error = `aidlc config models misslyckades: ${err.killed ? 'timeout efter 10 s' : err.message}`;
    console.warn(error);
  }
  try {
    const agents = await readAgentFiles(root);
    return agents.length ? { source: 'agent-files', agents, error } : { source: 'none', agents: [], error };
  } catch (err) {
    console.warn(`Kunde inte läsa ${AGENTS_DIR}:`, err.message);
    return { source: 'none', agents: [], error: `${error}; ${AGENTS_DIR}: ${err.message}` };
  }
}
