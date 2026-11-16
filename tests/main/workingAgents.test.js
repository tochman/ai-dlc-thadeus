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
        [2, dispatched('aidlc-architect-agent')],
        [3, completed('aidlc-architect-agent')],
        [4, stage('code-generation')],
        [5, dispatched('aidlc-quality-agent')],
        [6, completed('aidlc-quality-agent')],
        [7, dispatched('aidlc-quality-agent')]
      )
    );
    expect(list).toEqual([
      { agent: 'aidlc-quality-agent', name: 'quality', startedMs: Date.parse(at(7)), stage: 'code-generation' },
      { agent: 'aidlc-developer-agent', name: 'developer', startedMs: Date.parse(at(1)), stage: 'requirements-analysis' }
    ]);
  });

  it("lets a later dispatch of the same agent in the same stage replace an older open one, so a refused or interrupted dispatch's ghost is hidden (US-0025)", () => {
    // A hook refused the first dispatch, AI-DLC retried: two dispatches, one agent running.
    const log = events([0, stage('code-generation')], [1, dispatched('general-purpose')], [2, dispatched('general-purpose')]);
    expect(workingAgents(log).map((a) => a.startedMs)).toEqual([Date.parse(at(2))]);
    // The same agent type in another stage is another piece of work.
    const two = events(
      [0, stage('functional-design')],
      [1, dispatched('aidlc-developer-agent')],
      [2, stage('code-generation')],
      [3, dispatched('aidlc-developer-agent')]
    );
    expect(workingAgents(two).map((a) => a.stage)).toEqual(['code-generation', 'functional-design']);
  });

  it('drops the open dispatches of a stage once that stage has completed (US-0025)', () => {
    const log = events(
      [0, stage('functional-design')],
      [1, dispatched('aidlc-architect-agent')],
      [2, { Event: 'STAGE_COMPLETED', Stage: 'functional-design' }]
    );
    expect(workingAgents(log)).toEqual([]);
  });

  it("ignores Claude Code's own helper agents (Agent Type unknown), which never close a known agent (US-0025)", () => {
    const log = events([0, stage('code-generation')], [1, dispatched('aidlc-developer-agent')], [2, completed('unknown')], [3, completed('unknown')]);
    expect(workingAgents(log)).toMatchObject([{ agent: 'aidlc-developer-agent', stage: 'code-generation' }]);
  });
});

// A trimmed excerpt of a real Code Generation audit shard (2026-11-16): an interrupted developer dispatch, its
// retry, a completion, the running build's dispatch, then Claude Code's prompt-suggestion helpers completing as
// `unknown` after each turn, which also emptied AI-DLC's inflight file.
const REAL_SHARD = `# Audit log

## Stage Started
**Timestamp**: 2026-11-16T15:27:11Z
**Event**: STAGE_STARTED
**Stage**: code-generation

---

## Subagent Dispatched
**Timestamp**: 2026-11-16T15:42:49Z
**Event**: SUBAGENT_DISPATCHED
**Agent Type**: aidlc-developer-agent

---

## Subagent Dispatched
**Timestamp**: 2026-11-16T15:44:23Z
**Event**: SUBAGENT_DISPATCHED
**Agent Type**: aidlc-developer-agent

---

## Subagent Completed
**Timestamp**: 2026-11-16T15:46:40Z
**Event**: SUBAGENT_COMPLETED
**Agent Type**: aidlc-developer-agent
**Agent ID**: a03e8c764f9955186
**Message**: Jag stoppade i början av Del 1.

---

## Subagent Dispatched
**Timestamp**: 2026-11-16T15:51:41Z
**Event**: SUBAGENT_DISPATCHED
**Agent Type**: aidlc-developer-agent

---

## Subagent Completed
**Timestamp**: 2026-11-16T16:47:07Z
**Event**: SUBAGENT_COMPLETED
**Agent Type**: unknown
**Agent ID**: a1cb6a00a6082f094
**Message**: kör vidare

---

## Subagent Completed
**Timestamp**: 2026-11-16T16:56:37Z
**Event**: SUBAGENT_COMPLETED
**Agent Type**: unknown
**Agent ID**: a1cb6a00a6082f095
**Message**: nej, låt den vara av
`;

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

  it('lists the running build from the audit log while the inflight file is missing, empty or broken (US-0025)', async () => {
    await write(`${INTENT}/audit/host-1.md`, REAL_SHARD);
    const root = await openRoot(TMP);
    const running = [{ agent: 'aidlc-developer-agent', name: 'developer', startedMs: Date.parse('2026-11-16T15:51:41Z'), stage: 'code-generation' }];
    expect(await loadWorkingAgents(root, 'default', '261114-x')).toEqual(running);
    await write('aidlc/.aidlc-subagent-inflight', inflight(0));
    expect(await loadWorkingAgents(root, 'default', '261114-x')).toEqual(running);
    await write('aidlc/.aidlc-subagent-inflight', '{"entries": [');
    expect(await loadWorkingAgents(root, 'default', '261114-x')).toEqual(running);
  });

  it('does not throw for an intent without an audit folder', async () => {
    await write('aidlc/.aidlc-subagent-inflight', inflight(1));
    const root = await openRoot(TMP);
    expect(await loadWorkingAgents(root, 'default', '261114-x')).toEqual([]);
    await expect(loadWorkingAgents(root, 'default', '../x')).rejects.toThrow();
  });
});
