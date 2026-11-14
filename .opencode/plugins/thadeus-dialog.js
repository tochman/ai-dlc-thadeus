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
    await waitForAnswer(ctx, env, event?.properties ?? {}, f, deliver);
  } finally {
    await fs.rm(f.wait, { force: true }).catch(() => {});
    await fs.rm(f.tmp, { force: true }).catch(() => {});
  }
}

const onAnswered = (ctx, env, event) => writeEvent(env.dir, env.secret, 'answered', event, filesOf(env.dir, nextName()));

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
    on('form.created', (event) => onWaiting(ctx, env, 'question', event, deliverForm));
    on('form.replied', (event) => onAnswered(ctx, env, event));
    on('form.cancelled', (event) => onAnswered(ctx, env, event));
    on('permission.asked', (event) => onWaiting(ctx, env, 'permission', event, deliverPermission));
    on('permission.replied', (event) => {
      const id = event?.properties?.requestID;
      if (typeof id === 'string') env.replied.add(id);
      return onAnswered(ctx, env, event);
    });
  }
};
