// US-0506 u4 W2, W5, W6, W9: install to source choice. The real installer, AgentChannel, store and agentIpc on a
// temporary project, a fake pty (AC4.1.2, AC4.1.5, AC4.1.6).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { createAgentChannel } from '../../src/main/agentChannel.js';
import { createAgentEventStore } from '../../src/main/agentEvents.js';
import { adapters } from '../../src/main/agentAdapters.js';
import { createAgentIpc } from '../../src/main/agentIpc.js';
import { FILES, createHookInstaller, statusPusher } from '../../src/main/agentHooks.js';
import { fixture, removeProject, tempProject } from '../helpers/agentHooksFixtures.js';

const AUDIT = { eventId: 'audit-1', source: 'audit', kind: 'question', state: 'shown', projectId: 'p1', arrivedAtMs: 0, seq: 0 };
const noWatch = () => ({ ready: Promise.resolve(), close: async () => {} });
let root, base, channel, store, agent, installer;

beforeEach(async () => {
  root = await tempProject('flow-');
  base = await tempProject('flow-channel-');
  channel = createAgentChannel({ root: path.join(base, 'agent-channel'), log: () => {} });
  store = createAgentEventStore({
    channel,
    adapters,
    pty: { write: vi.fn(), tapOutput: vi.fn(() => () => {}) },
    timing: { on: false },
    auditEventsOf: () => [AUDIT],
    log: () => {}
  });
  installer = createHookInstaller({
    log: () => {},
    usedOf: () => ['claude'],
    watch: noWatch,
    onStatus: statusPusher({ senders: () => [], demote: (r, h) => agent.demote(r, h) })
  });
  agent = createAgentIpc({ channel, store, timing: { on: false }, hooksCurrent: installer.isCurrent, senders: () => [] });
  await installer.openProject('p1', root);
});
afterEach(async () => {
  await agent.shutdown();
  await installer.closeProject('p1');
  await removeProject(root);
  await removeProject(base);
});

const install = async () => {
  const pv = await installer.preview('p1', 'claude', 'install');
  return installer.apply('p1', pv.previewId);
};
const spawnTab = () => {
  const spawnFn = vi.fn(async () => 'pty-1');
  return agent.spawn({ projectId: 'p1', root, kind: 'agent', harness: 'claude' }, spawnFn).then(() => spawnFn.mock.calls[0][0]);
};

describe('install to source choice (W2, W9)', () => {
  it('missing, preview, apply, and a new agent tab gets a session', async () => {
    expect((await installer.status('p1'))[0].status).toBe('missing');
    expect(await spawnTab()).toEqual({});
    const out = await install();
    expect(out.status[0].status).toBe('current');
    const extra = await spawnTab();
    expect(existsSync(extra.env.THADEUS_SESSION_DIR)).toBe(true);
    expect(store.list('p1')).toEqual([]); // a live hook session: no audit fallback
  });

  it('Remove while that tab runs moves its next event to the audit fallback (W5, RD42)', async () => {
    await install();
    const { env } = await spawnTab();
    const pv = await installer.preview('p1', 'claude', 'remove');
    expect((await installer.apply('p1', pv.previewId)).status[0].status).toBe('missing');
    await vi.waitFor(() => expect(store.list('p1').map((e) => e.source)).toEqual(['audit']));
    await vi.waitFor(() => expect(existsSync(env.THADEUS_SESSION_DIR)).toBe(false));
    expect(installer.isCurrent(root, 'claude')).toBe(false);
  });

  it('AI-DLC rewriting the settings file between preview and apply refuses, and the new preview is built from the new text (W6)', async () => {
    await fs.mkdir(path.join(root, '.claude'));
    await fs.writeFile(path.join(root, FILES.settings), fixture('no-hooks.json'));
    const pv = await installer.preview('p1', 'claude', 'install');
    await fs.writeFile(path.join(root, FILES.settings), fixture('aidlc.json'));
    const out = await installer.apply('p1', pv.previewId);
    expect(out).toMatchObject({ result: 'refused', refusal: 'changedSincePreview', file: FILES.settings });
    expect(existsSync(path.join(root, FILES.script))).toBe(false);
    expect((await installer.apply('p1', out.preview.previewId)).result).toBe('written');
    const written = JSON.parse(await fs.readFile(path.join(root, FILES.settings), 'utf8'));
    expect(written.permissions).toEqual(JSON.parse(fixture('aidlc.json')).permissions);
  });
});
