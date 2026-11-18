// THADEUS agent dialogs: the opencode plugin (US-0506 u1 FR1.2, FR4.4, NFR5.7; channel protocol C1 v1).
// opencode plugin API V2 shape { id, setup(ctx) }, written without importing @opencode-ai/plugin (not installed here).
// Provisional until the manual opencode run (NFR5.7): ctx.event.on(type, handler), ctx.session.form.reply,
// ctx.permission.reply and ctx.log are read from opencode's source and docs, not from a recorded run.
//
// It writes the same C1 files as .thadeus/hooks/dialog.sh: form.created becomes a waiting "question" event, and
// form.replied / form.cancelled an "answered" event. US-0506 u2 BR5.2, BR5.11, RD13, SD8: permission.asked becomes a
// waiting "permission" event, and permission.replied an "answered" event carrying its requestID. The wait runs in its
// own task (a setTimeout chain), never awaited by an event handler, and every handler catches its own errors, so the
// plugin can never break opencode (RD8). The plugin never decides a permission itself: no ctx.permission.hook.
import fs from 'node:fs/promises';
import path from 'node:path';

const POLL_MS = 100;
const GONE_MS = 2000;
const PROTOCOL = 'v1';
/** The only answer-file texts that reach ctx.permission.reply (SD8); anything else hands back. */
const DECISIONS = new Set(['once', 'always', 'reject']);

// A strictly increasing epoch ms per process: two events in one ms still get different names (RD8, SCD3).
let lastMs = 0;
function nextName() {
  lastMs = Math.max(Date.now(), lastMs + 1);
  return `${lastMs}-${process.pid}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const header = (kind, secret) => `THADEUS-EVENT ${PROTOCOL} ${kind} ${secret}\n`;

/** The C1 file names of one event, built in one place. */
function filesOf(dir, base) {
  const a = path.join(dir, 'answers', base);
  return {
    tmp: path.join(dir, 'events', `${base}.tmp`),
    evt: path.join(dir, 'events', `${base}.evt`),
    wait: `${a}.wait`,
    ans: `${a}.ans`,
    took: `${a}.took`,
    nack: `${a}.nack`
  };
}

async function writeEvent(dir, secret, kind, event, f) {
  await fs.writeFile(f.tmp, header(kind, secret) + JSON.stringify(event));
  await fs.rename(f.tmp, f.evt);
}

/** Hands a form answer to opencode; a missing or failing reply leaves .nack so the app sends keys instead (RD2 step 3'). */
async function deliverForm(ctx, _env, form, f) {
  const text = await fs.readFile(f.took, 'utf8');
  if (!text) return fs.rm(f.took, { force: true }); // empty: hand back, opencode keeps its own form
  const reply = ctx.session?.form?.reply;
  try {
    if (typeof reply !== 'function') throw new Error('session.form.reply is not available');
    await reply({ sessionID: form.sessionID, formID: form.formID, answer: JSON.parse(text) });
    await fs.rm(f.took, { force: true });
  } catch (err) {
    ctx.log?.info?.(`thadeus-dialog: reply failed, the app types the answer instead: ${err.message}`);
    await fs.rename(f.took, f.nack);
  }
}

/**
 * RD13: one decision per request, only from the answer file. Replies only for exactly once, always or reject and only
 * while no permission.replied came for the request; a missing or failing reply leaves .nack (the store shows timedOut).
 * ponytail: a terminal answer landing between the replied check and the reply call still races; opencode applies the
 * first decision it gets, and the plugin cannot close that window (review R-06). Only opencode holding the request can.
 */
async function deliverPermission(ctx, env, req, f) {
  const text = await fs.readFile(f.took, 'utf8');
  if (!DECISIONS.has(text) || env.replied.has(req.requestID)) return fs.rm(f.took, { force: true }); // hand back
  const reply = ctx.permission?.reply;
  try {
    if (typeof reply !== 'function') throw new Error('permission.reply is not available');
    await reply({ sessionID: req.sessionID, requestID: req.requestID, decision: text });
    await fs.rm(f.took, { force: true });
  } catch (err) {
    ctx.log?.info?.(`thadeus-dialog: permission reply failed, answer in the terminal: ${err.message}`);
    await fs.rename(f.took, f.nack);
  }
}

/** Waits for the answer: taken by rename; gone after GONE_MS without a change in alive; ends at waitSeconds (RD1). */
async function waitForAnswer(ctx, env, props, f, deliver) {
  const started = Date.now();
  let last = null;
  let changedAt = started;
  for (;;) {
    const taken = await fs.rename(f.ans, f.took).then(
      () => true,
      () => false
    );
    if (taken) return deliver(ctx, env, props, f);
    const alive = await fs.readFile(path.join(env.dir, 'alive'), 'utf8').catch(() => null);
    if (alive === null) return;
    if (alive !== last) [last, changedAt] = [alive, Date.now()];
    if (Date.now() - changedAt >= GONE_MS || Date.now() - started >= env.waitSeconds * 1000) return;
    await sleep(POLL_MS);
  }
}

/** A waiting event (question or permission): the .wait marker first, then the event, then the wait (RD2 step 1). */
async function onWaiting(ctx, env, kind, event, deliver) {
  const f = filesOf(env.dir, nextName());
  try {
    await fs.writeFile(f.wait, '');
    await writeEvent(env.dir, env.secret, kind, event, f);
    report(ctx, env, 'activity', event); // US-0214 FR3.1: waiting, written after the waiting event so it keeps its name
    await waitForAnswer(ctx, env, event?.properties ?? {}, f, deliver);
  } finally {
    await fs.rm(f.wait, { force: true }).catch(() => {});
    await fs.rm(f.tmp, { force: true }).catch(() => {});
  }
}

const onAnswered = (ctx, env, event) => writeEvent(env.dir, env.secret, 'answered', event, filesOf(env.dir, nextName()));

// US-0506 u3 BR6.2, RD15, PD12, OD7: a top-level session gone idle is the agent's reply. One promise chain with its own
// catch, never awaited by the handler, so a slow or failing context read cannot hold opencode. A log line names the
// step and the error code only: never the message text, never the secret.
// ponytail: provisional shapes (K12): the event { type: 'session.status', properties: { sessionID, status: { type } } }
// and ctx.session.context({ sessionID }) giving { session: { id, parentID? }, messages }. The NFR2.5 manual run
// confirms them or replaces them with the recorded payloads.
const codeOf = (err) => err?.code ?? err?.name ?? 'unknown';
/** US-0213: a V2 event is { id, created, type, data }; the older shape is { type, properties }. Read both, defensively. */
const dataOf = (event) => event?.data ?? event?.properties ?? null;

function onIdle(ctx, env, event) {
  const props = dataOf(event);
  if (props?.status?.type !== 'idle') return Promise.resolve();
  return new Promise((resolve) => resolve(ctx.session.context({ sessionID: props.sessionID })))
    .catch((err) => {
      throw Object.assign(new Error('context read failed'), { step: codeOf(err) });
    })
    .then((context) => {
      if (context?.session?.parentID) return undefined; // a sub-agent session: its end is not a reply
      return writeEvent(env.dir, env.secret, 'reply', { event, context }, filesOf(env.dir, nextName())).catch((err) => {
        throw Object.assign(new Error('event write failed'), { step: codeOf(err) });
      });
    })
    .catch((err) => ctx.log?.error?.(`thadeus-dialog: ${err.message}: ${err.step}`));
}

// US-0213 FR1.2, FR1.5, FR4.2, FR5.1, FR8.1: opencode V2 names, each in one place (checked against opencode 2.1.4's docs).
// US-0214 FR1.2: the activity names, from the same docs.
export const OC = {
  created: 'session.created', // FR1.5: a new session; a child session has parentID
  status: 'session.status', // FR5.1: status.type idle | busy | retry
  idle: 'session.idle', // FR5.1 fallback when session.status is not sent
  usage: 'session.usage.updated', // FR1.2: { tokens: { input, output, reasoning, cache: { read, write } }, cost }
  compacted: 'session.compaction.ended', // FR8.1: compaction happened
  compactionHook: 'compaction', // FR4.2: ctx.session.hook(name, fn), V1 experimental.session.compacting
  formCreated: 'form.created',
  formReplied: 'form.replied',
  formCancelled: 'form.cancelled',
  permissionAsked: 'permission.asked',
  permissionReplied: 'permission.replied',
  toolStarted: 'session.tool.input.started',
  toolSuccess: 'session.tool.success',
  toolFailed: 'session.tool.failed',
  textStarted: 'session.text.started',
  textDelta: 'session.text.delta',
  textEnded: 'session.text.ended',
  reasoningStarted: 'session.reasoning.started',
  reasoningDelta: 'session.reasoning.delta',
  reasoningEnded: 'session.reasoning.ended',
  executionFailed: 'session.execution.failed',
  executionInterrupted: 'session.execution.interrupted'
};
/** US-0214 FR1.2: the events that are only activity; the app reads the event's type and known fields (NFR2). */
// ponytail: one event file per text or reasoning delta; batch them in the plugin if a long reply floods the folder.
const ACTIVITY_ONLY = [
  OC.toolStarted,
  OC.toolSuccess,
  OC.toolFailed,
  OC.textStarted,
  OC.textDelta,
  OC.textEnded,
  OC.reasoningStarted,
  OC.reasoningDelta,
  OC.reasoningEnded,
  OC.executionFailed,
  OC.executionInterrupted
];

/** A report-only event: written in its own task, never awaited by opencode; a failure logs its code only (NFR3). */
function report(ctx, env, kind, event) {
  writeEvent(env.dir, env.secret, kind, event, filesOf(env.dir, nextName())).catch((err) =>
    ctx.log?.error?.(`thadeus-dialog: ${kind} write failed: ${codeOf(err)}`)
  );
}

/** FR4.2: the compact instruction the app wrote into the session folder, as one more system part. Never sets a result. */
async function addCompactInstruction(env, event) {
  const text = await fs.readFile(path.join(env.dir, 'compact.txt'), 'utf8').catch(() => '');
  if (text && Array.isArray(event?.system)) event.system.push(text);
}

function subscribeHandoff(ctx, env, on) {
  let statusSeen = false;
  on(OC.created, (event) => {
    const d = dataOf(event);
    // US-0214 FR2.2: a child session is a dispatched agent (activity); the main chat is the US-0213 session event.
    report(ctx, env, (d?.info?.parentID ?? d?.parentID) ? 'activity' : 'session', event);
  });
  on(OC.usage, (event) => report(ctx, env, 'usage', event));
  on(OC.compacted, (event) => report(ctx, env, 'postcompact', event));
  on(OC.idle, (event) => {
    if (!statusSeen) report(ctx, env, 'status', event);
  });
  on(OC.status, (event) => {
    statusSeen = true;
    report(ctx, env, 'activity', event); // US-0214: busy, retry and idle; idle ends a child session's row
    const type = dataOf(event)?.status?.type;
    if (type === 'idle') return onIdle(ctx, env, event); // u3: the reply is the idle signal
    report(ctx, env, 'status', event); // busy, retry or unknown: not idle
    return undefined;
  });
  if (typeof ctx.session?.hook === 'function') {
    try {
      ctx.session.hook(OC.compactionHook, (event) => addCompactInstruction(env, event).catch(() => {}));
    } catch (err) {
      ctx.log?.error?.(`thadeus-dialog: compaction hook failed: ${codeOf(err)}`);
    }
  }
}

export default {
  id: 'thadeus-dialog',
  /** FR4.4: does nothing without THADEUS_SESSION_DIR, so opencode started outside the app is untouched. */
  async setup(ctx) {
    const dir = process.env.THADEUS_SESSION_DIR;
    const secret = process.env.THADEUS_SESSION_SECRET;
    const waitSeconds = Number(process.env.THADEUS_WAIT_SECONDS);
    if (!dir || !secret || !Number.isInteger(waitSeconds) || typeof ctx?.event?.on !== 'function') return;
    const env = { dir, secret, waitSeconds, replied: new Set() }; // replied: requestIDs opencode reported answered
    // One wrapper for every subscription: its own async task, its own catch, nothing returned to opencode (RD8).
    const on = (type, fn) =>
      ctx.event.on(type, (event) => {
        void (async () => fn(event))().catch((err) => ctx.log?.error?.(`thadeus-dialog: ${err.message}`));
      });
    on(OC.formCreated, (event) => onWaiting(ctx, env, 'question', event, deliverForm));
    on(OC.formReplied, (event) => onAnswered(ctx, env, event));
    on(OC.formCancelled, (event) => onAnswered(ctx, env, event));
    on(OC.permissionAsked, (event) => onWaiting(ctx, env, 'permission', event, deliverPermission));
    on(OC.permissionReplied, (event) => {
      const id = event?.properties?.requestID;
      if (typeof id === 'string') env.replied.add(id);
      return onAnswered(ctx, env, event);
    });
    for (const type of ACTIVITY_ONLY) on(type, (event) => report(ctx, env, 'activity', event)); // US-0214 FR1.2
    subscribeHandoff(ctx, env, on); // u3 idle replies and US-0213 reports
  }
};
