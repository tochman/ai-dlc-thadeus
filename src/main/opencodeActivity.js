// US-0058 FR1, FR3: project-scoped opencode tool activity from its stored timeline; content and tool inputs stay private.
import { pulsePaths } from './pulse.js';

const record = (value) => {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
};

/** US-0058 FR1, FR3: map only observed tool-time fields and project-relative path classifications. */
export function opencodeActivityEvents({ sessions = [], parts = [], messages = [] } = {}, projectRoot = null) {
  const byId = new Map(sessions.filter((s) => typeof s?.id === 'string').map((s) => [s.id, s]));
  const events = [];
  const startedChildren = new Set();
  for (const message of messages) {
    if (typeof message?.session_id !== 'string') continue;
    const session = byId.get(message.session_id);
    const data = record(message.data);
    const times = record(data?.time);
    if (!session || !times) continue;
    const parent = typeof session.parent_id === 'string' && byId.has(session.parent_id) ? byId.get(session.parent_id) : null;
    const sessionId = parent?.id ?? session.id;
    const child = parent ? { agentId: session.id, ref: session.id } : {};
    const base = { sessionId, harness: 'opencode', agentType: typeof session.agent === 'string' ? session.agent : null, ...child, toolId: message.id ?? null };
    if (parent && !startedChildren.has(session.id) && Number.isFinite(times.created)) {
      startedChildren.add(session.id);
      events.push({ ...base, toolId: null, atMs: times.created, name: 'agentStart' });
    }
    if (Number.isFinite(times.created)) events.push({ ...base, atMs: times.created, name: 'prompt' });
    const completedAt = Number.isFinite(times.completed) ? times.completed : times.streamed;
    if (Number.isFinite(completedAt)) events.push({ ...base, atMs: completedAt, name: 'stop' });
  }
  for (const part of parts) {
    if (part?.type !== 'tool' || typeof part.session_id !== 'string') continue;
    const session = byId.get(part.session_id);
    const data = record(part.data);
    const state = record(data?.state);
    const times = record(state?.time);
    const tool = typeof data?.tool === 'string' ? data.tool : null;
    const callId = typeof data?.callID === 'string' ? data.callID : part.id;
    if (!session || !data || !state || !times || !tool || !['completed', 'error'].includes(state.status)) continue;
    const parent = typeof session.parent_id === 'string' && byId.has(session.parent_id) ? byId.get(session.parent_id) : null;
    const sessionId = parent?.id ?? session.id;
    const child = parent ? { agentId: session.id, ref: session.id } : {};
    const paths = pulsePaths(tool, record(state.input), session.directory, projectRoot ?? session.directory);
    if (parent && !startedChildren.has(session.id) && Number.isFinite(times.start)) {
      startedChildren.add(session.id);
      events.push({
        sessionId,
        harness: 'opencode',
        agentType: typeof session.agent === 'string' ? session.agent : null,
        ...child,
        atMs: times.start,
        name: 'agentStart'
      });
    }
    for (const [name, atMs] of [
      ['toolStart', times.start],
      ['toolEnd', times.end]
    ]) {
      if (!Number.isFinite(atMs)) continue;
      events.push({
        sessionId,
        harness: 'opencode',
        agentType: typeof session.agent === 'string' ? session.agent : null,
        ...child,
        atMs,
        name,
        tool,
        toolId: callId ?? null,
        paths
      });
    }
  }
  return events.sort((a, b) => a.atMs - b.atMs);
}
