// US-0214 FR2, FR3, NFR2: the activity model behind Agent progress. Pure: activity events (the adapters' `activity`
// output, harness-neutral) go in through reduceActivity; activityRows gives one row per main chat (one per agent tab)
// and one per dispatched agent under it, each with one state and when it entered that state. Only the fields named
// here are ever copied, so no agent text can reach a row: tool names, states, reasons and error types only (NFR2).
//
// Event: { sessionId, tabId, harness, atMs, name, tool?, toolId?, agentId?, agentType?, ref?, reason?, error?, final? }
// name: prompt | busy | stop | idle | toolStart | toolEnd | text | reasoning | waiting | answered | error | agentStart | agentEnd
// ref: opencode's own session id, which tells a child session (an agent) from the main chat (FR2.2).
//
// US-0030 FR1, FR2, FR4, FR5, NFR1: two bounded texts more are copied, a tool call's `detail` and an agent's `task`
// (already cut by the adapter); toolStart may carry `detail`, `task` and `taskType`. A wait sits on the row of the agent
// that asked, and main shows `waiting` with reason `agent` while one of its agents waits. Each row gives `lastMs` and
// `stale` (no event for STALE_MS), whatever its state.

/** US-0214 A3: an interrupt sends no Stop, so a row with nothing running or waiting turns idle after this. */
export const IDLE_MS = 30000;
/** US-0030 FR5.1: a row with no new event for this long says when it was last seen. */
export const STALE_MS = 30000;
const QUESTION_TOOL = 'AskUserQuestion';
const DEFAULT_AGENT_TYPE = 'general-purpose'; // what Claude Code starts for an Agent call with no subagent_type
const text = (v) => (typeof v === 'string' && v ? v : null);

export const emptyActivity = () => ({ sessions: {} });

const newRow = (atMs, agentId = null, agentType = null) => ({
  agentId,
  agentType,
  task: null,
  startedMs: atMs,
  lastMs: atMs,
  tools: [], // open tools, oldest first: { id, name, detail }
  waiting: null,
  writing: false,
  thinking: false,
  error: null,
  idle: false,
  stateKey: null,
  sinceMs: atMs
});

/** US-0214 FR3.1, FR3.3: one state, by precedence error > waiting > tool > writing/thinking > idle; else working. */
function derive(row) {
  if (row.error) return { state: 'error', error: row.error };
  if (row.waiting) return { state: 'waiting', reason: row.waiting };
  const tool = row.tools.at(-1);
  if (tool) return { state: 'tool', tool: tool.name, detail: tool.detail };
  if (row.writing) return { state: 'writing' };
  if (row.thinking) return { state: 'thinking' };
  return { state: row.idle ? 'idle' : 'working' };
}
const keyOf = (d) => `${d.state}:${d.tool ?? d.reason ?? d.error ?? ''}`;

/** Applies one event to one row (mutates the copy reduceActivity made). */
function apply(row, ev) {
  const { name } = ev;
  if (name !== 'waiting' && name !== 'error') row.waiting = null; // the next event ends a wait
  if (name === 'prompt' || name === 'busy') Object.assign(row, { idle: false, error: null });
  else if (name === 'stop' || name === 'idle') Object.assign(row, { idle: true, tools: [], writing: false, thinking: false });
  else if (name === 'toolStart' && typeof ev.tool === 'string') {
    if (ev.tool === QUESTION_TOOL) row.waiting = 'question';
    else row.tools = [...row.tools.filter((t) => t.id !== ev.toolId), { id: ev.toolId ?? null, name: ev.tool, detail: text(ev.detail) }];
    row.idle = false;
  } else if (name === 'toolEnd') row.tools = row.tools.filter((t) => t.id !== ev.toolId);
  else if (name === 'text') Object.assign(row, { writing: ev.final !== true, idle: false });
  else if (name === 'reasoning') Object.assign(row, { thinking: ev.final !== true, idle: false });
  else if (name === 'waiting') row.waiting = typeof ev.reason === 'string' ? ev.reason : 'notification';
  else if (name === 'error') Object.assign(row, { error: typeof ev.error === 'string' ? ev.error : 'unknown', tools: [], writing: false, thinking: false });
  row.lastMs = ev.atMs;
  const key = keyOf(derive(row));
  if (key !== row.stateKey) Object.assign(row, { stateKey: key, sinceMs: ev.atMs });
}

/**
 * US-0030 FR2.1: an Agent call's task waits here until an agent of its type starts; its tool end drops it (an agent
 * that started took it already). SubagentStart carries no task and no parent tool id, so the pairing is by type, in order.
 */
function trackTasks(session, ev) {
  session.tasks ??= [];
  if (ev.name === 'toolStart' && text(ev.task)) session.tasks.push({ toolId: ev.toolId ?? null, task: ev.task, type: ev.taskType ?? DEFAULT_AGENT_TYPE });
  else if (ev.name === 'toolEnd' && ev.toolId) session.tasks = session.tasks.filter((t) => t.toolId !== ev.toolId);
}
function takeTask(session, agentType) {
  const i = session.tasks.findIndex((t) => t.type === agentType);
  return i < 0 ? null : session.tasks.splice(i, 1)[0].task;
}

/** Which agent an event belongs to: Claude Code's agent_id, or an opencode child session's id; null is the main chat. */
function agentOf(session, ev) {
  if (ev.agentId && ev.name !== 'agentStart') return ev.agentId;
  if (ev.ref && session.children.includes(ev.ref)) return ev.ref;
  return null;
}

/**
 * US-0214 FR2.1–FR2.3, FR3: the next state after one activity event. Returns a new state; the old one is unchanged.
 * @param {{sessions: object}} state
 * @param {object} ev see the header
 */
export function reduceActivity(state, ev) {
  if (!ev?.sessionId || typeof ev.name !== 'string' || !Number.isFinite(ev.atMs)) return state;
  const old = state.sessions[ev.sessionId];
  const session = old
    ? structuredClone(old)
    : { tabId: ev.tabId ?? null, harness: ev.harness ?? null, main: newRow(ev.atMs), agents: {}, children: [], tasks: [] };
  trackTasks(session, ev);
  if (ev.name === 'agentStart' && ev.agentId) {
    if (ev.ref && !session.children.includes(ev.agentId)) session.children.push(ev.agentId); // opencode parentID
    if (!session.agents[ev.agentId]) {
      session.agents[ev.agentId] = newRow(ev.atMs, ev.agentId, ev.agentType ?? null);
      session.agents[ev.agentId].task = takeTask(session, ev.agentType);
    }
    apply(session.agents[ev.agentId], { ...ev, name: 'busy' });
  } else {
    const agentId = agentOf(session, ev);
    const ending = ev.name === 'agentEnd' || (agentId && session.children.includes(agentId) && ev.name === 'idle');
    if (agentId && ending) {
      delete session.agents[agentId];
      session.children = session.children.filter((c) => c !== agentId);
      session.main.lastMs = ev.atMs;
    } else if (agentId) {
      session.agents[agentId] ??= newRow(ev.atMs, agentId, ev.agentType ?? null); // A2: no SubagentStart seen
      apply(session.agents[agentId], ev);
      session.main.lastMs = ev.atMs; // the main chat is alive while its agents are
    } else if (ev.name !== 'agentEnd') apply(session.main, ev);
  }
  return { ...state, sessions: { ...state.sessions, [ev.sessionId]: session } };
}

/** The state without one session (its agent tab ended). */
export function dropSession(state, sessionId) {
  if (!state.sessions[sessionId]) return state;
  const sessions = { ...state.sessions };
  delete sessions[sessionId];
  return { ...state, sessions };
}

/**
 * One row as the renderer sees it; the 30 s idle is applied here, against `nowMs` (A3). US-0030 FR1.2, FR1.4: `waitsOn`
 * is a waiting agent of a main row, shown as main waiting for it unless main has an error or its own wait.
 */
function view(row, extra, nowMs, waitsOn = null) {
  let d = derive(row);
  let sinceMs = row.sinceMs;
  if (waitsOn && d.state !== 'error' && d.state !== 'waiting')
    [d, sinceMs] = [{ state: 'waiting', reason: 'agent', waitingFor: waitsOn.agentType }, waitsOn.sinceMs];
  const quiet = d.state === 'working' || d.state === 'writing' || d.state === 'thinking';
  if (quiet && nowMs - row.lastMs >= IDLE_MS) [d, sinceMs] = [{ state: 'idle' }, row.lastMs + IDLE_MS];
  return {
    ...extra,
    agentId: row.agentId,
    agentType: row.agentType,
    task: row.task ?? null,
    state: d.state,
    tool: d.tool ?? null,
    detail: d.detail ?? null,
    reason: d.reason ?? null,
    waitingFor: d.waitingFor ?? null,
    error: d.error ?? null,
    sinceMs,
    lastMs: row.lastMs,
    stale: nowMs - row.lastMs >= STALE_MS
  };
}

/**
 * US-0214 FR2.1, FR2.2, FR3.2: the rows now, each main chat followed by its agents (oldest first).
 * US-0030 FR1.2, FR2.1, FR4.1, FR5.1: with task, detail, waitingFor, lastMs and stale.
 * @returns {Array<{key, kind: 'main'|'agent', parent, sessionId, tabId, harness, agentId, agentType, task, state, tool, detail,
 *   reason, waitingFor, error, sinceMs, lastMs, stale}>}
 */
export function activityRows(state, nowMs = Date.now()) {
  return Object.entries(state.sessions).flatMap(([sessionId, s]) => {
    const base = { sessionId, tabId: s.tabId, harness: s.harness };
    const key = `main:${sessionId}`;
    const sorted = Object.values(s.agents).sort((a, b) => a.startedMs - b.startedMs);
    const agents = sorted.map((a) => view(a, { ...base, key: `agent:${sessionId}:${a.agentId}`, kind: 'agent', parent: key }, nowMs));
    const waitsOn = agents.find((a) => a.state === 'waiting') ?? null;
    return [view(s.main, { ...base, key, kind: 'main', parent: null }, nowMs, waitsOn), ...agents];
  });
}
