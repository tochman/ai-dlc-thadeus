import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { loadWorkingAgents, workingAgents } from '../../src/main/projectService.js';
import { categoryOf, mergeAudits } from '../../src/main/parsers/audit.js';

// Shards in AI-DLC's audit format, through the same parser and categories loadAuditEvents uses.
const block = (fields) =>
  Object.entries(fields)
    .map(([k, v]) => `**${k}**: ${v}`)
    .join('\n');
const at = (min) => new Date(Date.UTC(2026, 10, 14, 2, min)).toISOString();
const shard = (...blocks) => blocks.map(([min, f]) => block({ Timestamp: at(min), ...f })).join('\n\n---\n\n');
const events = (...blocks) => mergeAudits([{ source: 'host-1.md', text: shard(...blocks) }]).map((e) => ({ ...e, category: categoryOf(e.event) }));
const stage = (s) => ({ Event: 'STAGE_STARTED', Stage: s });
const dispatched = (agent) => ({ Event: 'SUBAGENT_DISPATCHED', 'Agent Type': agent });
const completed = (agent) => ({ Event: 'SUBAGENT_COMPLETED', 'Agent Type': agent, 'Agent ID': 'a1' });

describe('workingAgents', () => {
  it("closes each agent type's oldest dispatch with its first later completion, and names the stage it ran in", () => {
    const list = workingAgents(
      events(
        [0, stage('requirements-analysis')],
        [1, dispatched('aidlc-developer-agent')],
        [2, dispatched('aidlc-developer-agent')],
        [3, completed('aidlc-developer-agent')],
        [4, stage('code-generation')],
        [5, dispatched('aidlc-quality-agent')],
        [6, completed('aidlc-quality-agent')],
        [7, dispatched('aidlc-quality-agent')]
      ),
      5
    );
    expect(list).toEqual([
      { agent: 'aidlc-quality-agent', name: 'quality', startedMs: Date.parse(at(7)), stage: 'code-generation' },
      { agent: 'aidlc-developer-agent', name: 'developer', startedMs: Date.parse(at(2)), stage: 'requirements-analysis' }
    ]);
  });

  it("shows at most as many as are running, newest first, so a refused dispatch's ghost is hidden", () => {
    // A hook refused the first dispatch, AI-DLC retried: two dispatches, one agent running.
    const log = events([0, stage('code-generation')], [1, dispatched('general-purpose')], [2, dispatched('general-purpose')]);
    expect(workingAgents(log, 1).map((a) => a.startedMs)).toEqual([Date.parse(at(2))]);
    expect(workingAgents(log, 0)).toEqual([]);
  });
});

const TMP = path.resolve(__dirname, '../.tmp/working-agents');
const INTENT = 'aidlc/spaces/default/intents/261114-x';
const write = async (rel, text) => {
  await fs.mkdir(path.dirname(path.join(TMP, rel)), { recursive: true });
  await fs.writeFile(path.join(TMP, rel), text);
};
const inflight = (n) =>
  JSON.stringify({ version: 1, entries: Array.from({ length: n }, (_, i) => ({ sessionId: `s${i}`, startedAtMs: 1, authority: 'hook' })) });

describe('loadWorkingAgents', () => {
  beforeEach(async () => {
    await fs.rm(TMP, { recursive: true, force: true });
    await fs.mkdir(path.join(TMP, INTENT), { recursive: true });
  });
  afterEach(() => fs.rm(TMP, { recursive: true, force: true }));

  it('lists nothing while the inflight file is missing, empty or broken, whatever the audit log says', async () => {
    await write(`${INTENT}/audit/host-1.md`, shard([0, stage('code-generation')], [1, dispatched('aidlc-developer-agent')]));
    const root = await openRoot(TMP);
    expect(await loadWorkingAgents(root, 'default', '261114-x')).toEqual([]);
    await write('aidlc/.aidlc-subagent-inflight', inflight(0));
    expect(await loadWorkingAgents(root, 'default', '261114-x')).toEqual([]);
    await write('aidlc/.aidlc-subagent-inflight', '{"entries": [');
    expect(await loadWorkingAgents(root, 'default', '261114-x')).toEqual([]);

    await write('aidlc/.aidlc-subagent-inflight', inflight(1));
    expect(await loadWorkingAgents(root, 'default', '261114-x')).toMatchObject([{ name: 'developer', stage: 'code-generation' }]);
  });

  it('does not throw for an intent without an audit folder', async () => {
    await write('aidlc/.aidlc-subagent-inflight', inflight(1));
    const root = await openRoot(TMP);
    expect(await loadWorkingAgents(root, 'default', '261114-x')).toEqual([]);
    await expect(loadWorkingAgents(root, 'default', '../x')).rejects.toThrow();
  });
});
