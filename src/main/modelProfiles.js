// Model profiles per project (US-0210): which plans are critical, a critical and an economy profile, and the one the
// app last switched to. A profile is an optional AI-DLC saved profile (`--from <name>`, effort per group) plus one
// model per agent. Saved in the app's own settings file (FR1.5); the app only runs the `aidlc` CLI (NFR2).
import { PROFILE_NAME, buildModelCommand, run } from './modelChoice.js';
import { inProgress } from './projectService.js';
import { t } from '../shared/i18n.js';

const AGENT = /^[a-z][a-z0-9-]{0,63}$/;
const ACTIVE = new Set(['critical', 'economy']);

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const validName = (v) => typeof v === 'string' && v.length <= 64 && PROFILE_NAME.test(v);

/** One profile: the saved-profile name when valid, and the agent -> model pairs with valid names (FR1.2, FR1.3). */
function sanitizeProfile(raw) {
  const models = isObject(raw?.models)
    ? Object.fromEntries(Object.entries(raw.models).filter(([a, m]) => AGENT.test(a) && typeof m === 'string' && m && m.length <= 200))
    : {};
  return { ...(validName(raw?.from) ? { from: raw.from } : {}), models };
}

/** US-0210 FR1.5: the stored model profiles; every invalid part falls back to its default. */
export function sanitizeModelProfiles(raw) {
  const plans = Array.isArray(raw?.criticalPlans) ? raw.criticalPlans.filter((p) => typeof p === 'string' && p.length <= 64) : [];
  return {
    criticalPlans: [...new Set(plans)].slice(0, 50),
    critical: sanitizeProfile(raw?.critical),
    economy: sanitizeProfile(raw?.economy),
    askBeforeBack: raw?.askBeforeBack === true, // FR1.4: off unless saved as true
    active: ACTIVE.has(raw?.active) ? raw.active : null
  };
}

/** US-0210 AC1.1.6: refuses a change whose saved-profile name breaks the name rule, so the earlier value is kept. */
export function checkModelProfiles(change) {
  if (!isObject(change)) throw new Error(t('errors.invalidValue', { what: 'modelProfiles', value: String(change) }));
  for (const kind of ['critical', 'economy']) {
    const from = change[kind]?.from;
    if (from !== undefined && !validName(from)) throw new Error(t('errors.invalidValue', { what: `modelProfiles.${kind}`, value: String(from) }));
  }
}

/** US-0210 FR1.2: the names in `config models --show --json`'s `data.profiles` (an object keyed by name, or a list). */
export function savedProfileNames(profiles) {
  let names = [];
  if (Array.isArray(profiles)) names = profiles.map((p) => (typeof p === 'string' ? p : p?.name));
  else if (isObject(profiles)) names = Object.keys(profiles);
  return [...new Set(names.filter(validName))].sort();
}

/**
 * US-0210 FR2.2: the args of every command a switch runs: `--from` first (when the profile names one), then one
 * `--agent <a> --model <m>` per agent with a model. Throws before anything runs on a value outside the tables.
 */
export function profileCommands(profile, harness, models) {
  const changes = [
    ...(profile?.from ? [{ from: profile.from }] : []),
    ...Object.entries(profile?.models ?? {})
      .filter(([, model]) => model)
      .map(([agent, model]) => ({ agent, model }))
  ];
  return changes.map((c) => buildModelCommand({ ...c, harness, where: 'project' }, models).args);
}

/**
 * US-0210 FR4.2, FR4.3: runs a profile's commands in order and stops at the first failure. Never throws.
 * @returns {Promise<{ok: boolean, results: object[], error?: string}>}
 */
export async function runProfile(root, profile, harness, models, { exec } = {}) {
  let commands;
  try {
    commands = profileCommands(profile, harness, models);
  } catch (err) {
    return { ok: false, results: [], error: err.message };
  }
  const results = [];
  for (const args of commands) {
    const res = await run(root, args, exec);
    results.push(res);
    if (!res.ok) return { ok: false, results };
  }
  return { ok: true, results };
}

/**
 * US-0210 FR2, FR3: decides from each new intent list whether to ask for the critical profile or to switch back.
 * Intents seen at `baseline` never ask (FR2.4). `answered` tells it how a critical question ended; only a switch
 * that ran makes its intents count for the switch back (FR3.3).
 */
export function createProfileTracker() {
  const seen = new Set();
  const switchedFor = new Set();
  let pending = []; // the critical intents of the open question
  return {
    baseline(intents) {
      for (const i of intents ?? []) seen.add(i.dirName);
    },
    /** @returns {{ask: object}|{switchBack: true}|null} */
    update(intents, settings) {
      const { criticalPlans, active } = sanitizeModelProfiles(settings);
      const open = new Set(intents.filter(inProgress).map((i) => i.dirName));
      const fresh = intents.filter((i) => !seen.has(i.dirName) && open.has(i.dirName) && criticalPlans.includes(i.plan ?? i.scope));
      for (const i of intents) seen.add(i.dirName);
      const had = switchedFor.size > 0;
      for (const d of switchedFor) if (!open.has(d)) switchedFor.delete(d);
      if (active === 'critical') {
        for (const i of fresh) switchedFor.add(i.dirName); // critical wins until the last critical intent ends (FR3.1)
        return had && !switchedFor.size ? { switchBack: true } : null;
      }
      const asking = pending.length > 0;
      pending.push(...fresh.map((i) => i.dirName));
      return !asking && fresh.length ? { ask: fresh[0] } : null;
    },
    answered(kind, switched) {
      if (kind !== 'critical') return;
      if (switched) for (const d of pending) switchedFor.add(d);
      pending = [];
    }
  };
}
