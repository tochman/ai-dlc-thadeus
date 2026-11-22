// US-0213 FR2, FR3.2–FR3.5, FR4.1, FR5, FR6.2 (and US-0026 FR3.3): the session handoff's decisions. Pure, no Node
// imports, so main decides and the renderer can build the same commands and instruction.
import { normalizeModel } from './reprice.js';

/** FR6.1, FR6.3: per project; the threshold in tokens. */
export const HANDOFF_DEFAULTS = { threshold: 150_000, onThreshold: true, onStage: true, onGate: true, autoCompactWindow: false };
export const THRESHOLD_MIN = 10_000;
export const THRESHOLD_MAX = 1_000_000;
/** FR6.2: Not now at the threshold asks again after this many more tokens. */
export const REOFFER_STEP = 50_000;
/** FR5.2: a key within this long counts as typing. */
export const TYPING_MS = 5_000;

/**
 * FR2.1, FR6.2: whether the context size `tokens` offers the threshold page. `state` is { offered, declinedAt } or null;
 * a size back under the threshold (after a compaction or a fresh session) starts over.
 * @returns {{offer: boolean, state: {offered: boolean, declinedAt: number|null}}}
 */
export function decideThreshold(state, tokens, settings) {
  const s = { offered: false, declinedAt: null, ...(state ?? {}) };
  if (!Number.isFinite(tokens) || !settings?.onThreshold) return { offer: false, state: s };
  if (tokens < settings.threshold) return { offer: false, state: { offered: false, declinedAt: null } };
  if (s.declinedAt !== null) {
    const again = tokens >= s.declinedAt + REOFFER_STEP;
    return { offer: again, state: again ? { offered: true, declinedAt: null } : s };
  }
  return { offer: !s.offered, state: { ...s, offered: true } };
}

const GATE_EVENTS = new Set(['STAGE_AWAITING_APPROVAL', 'GATE_APPROVED', 'GATE_REJECTED', 'STAGE_COMPLETED']);

/**
 * FR2.2, FR2.3: the stage boundary the intent's files show now. A gate needs a `[?]` stage in the state file and
 * STAGE_AWAITING_APPROVAL as the latest gate event; a completion is STAGE_COMPLETED as the latest. Else null.
 * @param {string} stateText aidlc-state.md
 * @param {Array<{event: string, fields: object, timeMs: number}>} auditEvents
 */
export function boundaryOf(stateText, auditEvents) {
  const last = [...(auditEvents ?? [])]
    .filter((e) => GATE_EVENTS.has(e?.event))
    .sort((a, b) => (a.timeMs ?? 0) - (b.timeMs ?? 0))
    .at(-1);
  if (!last) return null;
  const stage = last.fields?.Stage ?? null;
  // A stage line `- [?] <stage>`; the file's own legend comment also names [?] and is no gate.
  if (last.event === 'STAGE_AWAITING_APPROVAL') return /^\s*- \[\?\]/m.test(String(stateText ?? '')) ? { kind: 'gate', stage, key: String(stage) } : null;
  if (last.event === 'STAGE_COMPLETED') return { kind: 'stage', stage, key: String(stage) };
  return null;
}

/**
 * FR2.4, FR6.2: one offer per boundary. A gate at the boundary of a still-pending stage offer replaces it; once a
 * boundary was offered, it waits for the next boundary.
 * @returns {{offer: 'stage'|'gate'|null, state: {key: string|null, kind: string|null}}}
 */
export function decideBoundary(state, boundary, settings, { pending = false } = {}) {
  const s = state ?? { key: null, kind: null };
  if (!boundary) return { offer: null, state: s };
  const allowed = boundary.kind === 'gate' ? settings?.onGate : settings?.onStage;
  if (!allowed) return { offer: null, state: s };
  const same = s.key === boundary.key;
  if (same && !(pending && s.kind === 'stage' && boundary.kind === 'gate')) return { offer: null, state: s };
  return { offer: boundary.kind, state: { key: boundary.key, kind: boundary.kind } };
}

/**
 * FR5.1, FR5.2: the agent is idle after a stop, with nothing running, nothing waiting, no background task and no key
 * since that stop or in the last TYPING_MS.
 */
export function isIdle(sig, nowMs) {
  if (!sig || sig.lastStopMs == null || sig.busy || sig.waiting || sig.backgroundTasks === true) return false;
  if (sig.notify === 'permission_prompt') return false;
  if (sig.lastInputMs != null && (sig.lastInputMs > sig.lastStopMs || nowMs - sig.lastInputMs < TYPING_MS)) return false;
  return true;
}

/** FR3.4: USD for one turn at this size, from the cache-read price per million tokens; null without a rate or size. */
export function turnCost(tokens, model, rates) {
  if (!Number.isFinite(tokens)) return null;
  const key = normalizeModel(model, rates);
  return key ? (tokens * rates[key].cacheRead) / 1e6 : null;
}

const one = (v) => String(v ?? '?').replace(/[\r\n]+/g, ' ');
const list = (v) => (Array.isArray(v) && v.length ? v.map(one).join(', ') : 'none');

/**
 * FR4.1: the compact instruction, one line. Keeps intent, stage, Unit, open decisions and files left; drops the rest.
 * ponytail: English only, as AI-DLC's own prompts are; translate if a harness ever needs it in the person's language.
 */
export function compactInstruction({ intent, stage, unit, openDecisions, filesLeft } = {}) {
  return (
    `Keep for the AI-DLC workflow: intent ${one(intent)}, stage ${one(stage)}, unit ${one(unit ?? 'none')}; ` +
    `open decisions: ${list(openDecisions)}; files left to change: ${list(filesLeft)}. ` +
    'Drop file contents and test output; they are on disk.'
  );
}

// FR3.2, FR3.3, FR3.5, NFR4: the fixed command text per harness; only the compact instruction is filled in.
const COMMANDS = {
  claude: { compact: (i) => [`/compact ${i}`], fresh: () => ['/clear', '/aidlc --resume'], clear: () => ['/clear'] },
  opencode: { compact: () => ['/compact'], fresh: () => ['/new', '/aidlc --resume'], clear: () => ['/new'] }
};

/** The lines to type for `action` (compact, fresh, clear), or null for a harness with no commands. */
export function handoffCommands(harness, action, instruction = '') {
  const fn = Object.hasOwn(COMMANDS, harness) && Object.hasOwn(COMMANDS[harness], action) ? COMMANDS[harness][action] : null;
  return fn ? fn(one(instruction)) : null;
}

// US-0039 FR2.2, NFR4: the one line that asks a working AI-DLC to stop at its next safe point; fixed per harness.
const PARK = 'THADEUS: the person asked for a fresh session. At your next safe point, run `aidlc engine orchestrate park --person-asked` and end your turn.';
const PARK_REQUEST = { claude: PARK, opencode: PARK };
const RESUME = '/aidlc --resume';

/** US-0039 FR2.2, NFR4: the park request for `harness`, or null for a harness with no commands. */
export const parkRequest = (harness) => (Object.hasOwn(PARK_REQUEST, harness) ? PARK_REQUEST[harness] : null);

const BOUNDARY_CHOICES = ['compact', 'fresh', 'notNow'];
const NEW_SESSION_CHOICES = ['clear', 'clearResume']; // US-0026 FR3.3: the context is still small, so no Compact
const ACTION = { compact: 'compact', fresh: 'fresh', clear: 'clear', clearResume: 'fresh' };
const currentStage = (stateText) => /\*\*Current Stage\*\*:\s*(\S+)/.exec(String(stateText ?? ''))?.[1] ?? null;

/**
 * US-0213 FR2, FR3, FR5, FR6.2, FR8.1, US-0026 FR3.3: decides when the handoff page shows and what each choice types.
 * Every dependency is passed in (no Node, no Electron), so the whole flow runs in plain tests.
 * @param {{store, readContext: (path) => Promise<{tokens, model}|null>, ratesOf: (projectId) => Promise<object>,
 *   settingsOf: (projectId) => Promise<object>, inputsOf: (projectId) => Promise<{dirName, stateText, events}[]>,
 *   writeInstruction: (sessionId, text) => Promise<void>, log?: Function, now?: () => number}} deps
 */
export function createHandoffController({ store, readContext, ratesOf, settingsOf, inputsOf, writeInstruction, log = console.warn, now = Date.now }) {
  const projects = new Map(); // projectId -> { threshold, boundary, context: Map<sessionId, {tokens, model}>, after }
  const of = (projectId) => {
    if (!projects.has(projectId)) projects.set(projectId, { threshold: null, boundary: null, context: new Map(), after: null });
    return projects.get(projectId);
  };
  const say = (line) => log(`[handoff] ${line}`);
  const parks = new Map(); // US-0039: eventId -> when its park request went out

  async function offer(projectId, sessionId, harness, moment) {
    if (!handoffCommands(harness, 'fresh')) return null; // FR3.5, FR7.1: no commands, so no page with nothing to choose
    const p = of(projectId);
    const ctx = p.context.get(sessionId) ?? null;
    const [rates, inputs] = await Promise.all([ratesOf(projectId), inputsOf(projectId)]);
    const intent = inputs[0];
    const instruction = compactInstruction({ intent: intent?.dirName, stage: currentStage(intent?.stateText) });
    await writeInstruction(sessionId, instruction).catch((err) => say(`instruction not written: ${err.code ?? err.message}`));
    const choices = moment === 'newSession' ? NEW_SESSION_CHOICES : BOUNDARY_CHOICES;
    const tokens = ctx?.tokens ?? null;
    const model = ctx?.model ?? null;
    say(`offer ${moment} at ${tokens ?? '?'} tokens`);
    return store.addHandoff(sessionId, { moment, tokens, model, cost: turnCost(tokens, model, rates), choices, gate: moment === 'gate', instruction });
  }

  async function onContext(note, ctx) {
    const p = of(note.projectId);
    p.context.set(note.sessionId, ctx);
    if (p.after) {
      say(`${p.after.action}: ${p.after.before ?? '?'} → ${ctx.tokens} tokens`); // FR8.1: before and after
      p.after = null;
    }
    const settings = await settingsOf(note.projectId);
    const d = decideThreshold(p.threshold, ctx.tokens, settings);
    p.threshold = d.state;
    if (d.offer) await offer(note.projectId, note.sessionId, note.harness, 'threshold');
  }

  store.onHandoffClosed?.((ev) => {
    const p = of(ev.projectId);
    if (ev.handoff?.moment === 'threshold' && p.threshold) p.threshold = { ...p.threshold, declinedAt: ev.handoff.tokens };
    say(`not now: ${ev.handoff?.moment}`);
  });

  return {
    /** The store's onSignal: a stop or usage carries the size; a startup offers the new-session page; a compaction is noted. */
    async onSignal(note) {
      try {
        const k = note.parsed?.kind ?? note.kind;
        if (k === 'reply' && note.parsed.signals?.transcriptPath) {
          const ctx = await readContext(note.parsed.signals.transcriptPath);
          if (ctx) await onContext(note, ctx);
        } else if (k === 'usage' && note.parsed.context) await onContext(note, note.parsed.context);
        else if (k === 'session' && (note.parsed.source === 'startup' || note.parsed.source === 'resume')) {
          if ((await inputsOf(note.projectId)).length) await offer(note.projectId, note.sessionId, note.harness, 'newSession');
        } else if (k === 'postcompact') say('compaction done');
      } catch (err) {
        say(`signal failed: ${err.message}`);
      }
    },
    /** FR2.2–FR2.4: after an intent file changes. */
    async refreshBoundary(projectId) {
      const session = store.sessionsOf(projectId)[0];
      if (!session) return;
      const p = of(projectId);
      const [settings, inputs] = await Promise.all([settingsOf(projectId), inputsOf(projectId)]);
      const boundary = inputs.map((i) => boundaryOf(i.stateText, i.events)).find(Boolean) ?? null;
      const pendingId = p.pendingBoundary && store.handoffOf(p.pendingBoundary) ? p.pendingBoundary : null;
      const d = decideBoundary(p.boundary, boundary, settings, { pending: Boolean(pendingId) });
      p.boundary = d.state;
      if (d.offer) p.pendingBoundary = await offer(projectId, session.sessionId, session.harness, d.offer);
    },
    /**
     * FR3.2, FR3.3, NFR4: the fixed lines for an offered choice, and whether to wait for the new session in between.
     * US-0039 FR2.1–FR2.4: `mode` is `now` when the agent is idle (as before) and `park` otherwise: the park request
     * goes first (see park), the lines once the agent stops. A parked Compact resumes the workflow after compacting.
     */
    commandsFor(eventId, choice) {
      const h = store.handoffOf(eventId);
      if (!h || choice === 'notNow' || !h.handoff.choices.includes(choice)) return null;
      const base = handoffCommands(h.harness, ACTION[choice], h.handoff.instruction);
      if (!base) return null;
      const mode = isIdle(store.signalsOf(h.sessionId), now()) ? 'now' : 'park';
      const lines = mode === 'park' && ACTION[choice] === 'compact' ? [...base, RESUME] : base;
      return { lines, waitReady: lines.length > 1, mode };
    },
    /**
     * US-0039 FR2.1, FR2.2: asks a working agent to park. At an open question (an AI-DLC gate) the request is that
     * question's own answer, so nothing is typed into the agent's picker; otherwise it gives the line to type.
     * ponytail: while only a permission waits (or a question takes no own answer) the request is held, as typing would
     * land in that picker; the choice then waits for the stop as before US-0039.
     * @returns {Promise<{line: string|null, sent: boolean}|null>}
     */
    async park(eventId) {
      const h = store.handoffOf(eventId);
      const text = h && parkRequest(h.harness);
      if (!text) return null;
      parks.set(eventId, now());
      if (!store.signalsOf(h.sessionId)?.waiting) {
        say('park request typed');
        return { line: text, sent: true };
      }
      const q = store
        .list(h.projectId)
        .filter((e) => e.sessionId === h.sessionId && e.kind === 'question' && (e.state === 'shown' || e.state === 'timedOut'))
        .at(-1);
      if (!q || !q.questions.every((x) => x.allowOwn)) {
        say('park request held: a picker waits');
        return { line: null, sent: false };
      }
      await store.answer(q.eventId, { question: { picks: q.questions.map(() => []), own: q.questions.map(() => text) } });
      say('park request given as the open question’s answer');
      return { line: null, sent: true };
    },
    /** FR5.1: whether the page's agent is idle now; US-0039 FR2.2: after a park request, only after a stop since it. */
    idle(eventId) {
      const h = store.handoffOf(eventId);
      const sig = h && store.signalsOf(h.sessionId);
      const since = parks.get(eventId);
      return Boolean(sig) && (since == null || sig.lastStopMs > since) && isIdle(sig, now());
    },
    /** FR3.2: resolves once the session after /clear (or /new, or US-0039 FR2.3 a compaction) is ready, false after `ms`. */
    waitReady(eventId, ms = 30_000) {
      const h = store.handoffOf(eventId);
      return h ? store.waitForSession(h.sessionId, ['clear', 'startup', 'compact'], ms) : Promise.resolve(false);
    },
    /** FR8.1: the choice was typed; the size before is logged now, the size after with the next reading. */
    sent(eventId, choice) {
      const h = store.handoffOf(eventId);
      if (!h) return;
      say(`${choice} sent at ${h.handoff.tokens ?? '?'} tokens`);
      of(h.projectId).after = { action: choice, before: h.handoff.tokens };
      store.setHandoff(eventId, 'ended');
    }
  };
}
