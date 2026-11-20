// The app's own settings file in userData. It is never an AI-DLC file. (The app's only other writes are the
// downloaded update under userData/updates and the Guard Policy lock in aidlcWrite.js, EPIC-09 tier 2.)
import { app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DEFAULT_FEATURES_PATH, isValidFeaturesPath } from './parsers/features.js';
import { DELIVERY, isValidBranchName } from './parsers/releases.js';
import { LANGUAGE_SETTINGS, t } from '../shared/i18n.js';
import { HARNESSES, selectableHarness } from '../shared/harnesses.js';
import { TOOL_IDS, isStoredPath } from './tools.js';
import { checkModelProfiles, sanitizeModelProfiles } from './modelProfiles.js';
import { isValidRatesPath } from './modelRates.js';
import { HANDOFF_DEFAULTS, THRESHOLD_MAX, THRESHOLD_MIN } from './sessionHandoff.js';

export { TOOL_IDS };

const DEFAULTS = { openProjects: [], recentProjects: [], activeProject: null, projectSettings: {} };
export const PROJECT_DEFAULTS = { featureDocs: 'auto', featuresPath: DEFAULT_FEATURES_PATH };
const FEATURE_DOCS = new Set(['auto', 'show', 'hide']);
const ANIMATIONS = new Set(['full', 'reduced', 'off']); // "Animationer: Full / Dämpad / Av" (EPIC-04 FR4.2)
// "Frågor från Claude: Popup och notis / Bara popup / Av" (EPIC-05 US-0505 FR4.1); unset means popup-notify.
export const QUESTION_ALERTS = new Set(['popup-notify', 'popup', 'off']);
// "Meddelanden från agenten: Dialog och notis / Bara raden / Av" (US-0506 u5 D1, SD55); unset means dialog-notify.
export const REPLY_ALERTS = new Set(['dialog-notify', 'line', 'off']);
// The Settings tabs, in rail order (US-0410 FR1.1, FR5.1); unset means Tools.
export const SETTINGS_TABS = ['tools', 'appearance', 'notifications', 'project', 'about'];
const file = () => path.join(app.getPath('userData'), 'settings.json');

const stringList = (v) => (Array.isArray(v) ? v.filter((s) => typeof s === 'string').slice(0, 50) : []);

/** The views with a foldable list column (US-0415 FR5.3). */
const FOLD_VIEWS = ['intents', 'features', 'editor'];

/** US-0415 FR5.3: the folded state per known view id, booleans only. An empty result leaves the key out. */
function sanitizeListFolded(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(FOLD_VIEWS.filter((id) => typeof raw[id] === 'boolean').map((id) => [id, raw[id]]));
}

/** The chosen tool paths, kept per known id (US-0405 FR2.4). An empty result leaves the key out entirely. */
function sanitizeToolPaths(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(TOOL_IDS.filter((id) => isStoredPath(raw[id])).map((id) => [id, raw[id]]));
}

/**
 * The agent tabs open side by side (EPIC-08 US-0803): selectable harness ids only, deduplicated, in table
 * order. Null when nothing usable is left, so the single-harness choice from US-0801 applies.
 */
export function sanitizeHarnessTabs(raw) {
  if (!Array.isArray(raw)) return null;
  const ids = HARNESSES.filter((h) => h.selectable && raw.includes(h.id)).map((h) => h.id);
  return ids.length ? ids : null;
}

/** What the updater remembers (EPIC-04 US-0407); deleteAfterInstall is on unless it is saved as false. */
export const UPDATE_DEFAULTS = { deleteAfterInstall: true };
const VERSION = /^\d+\.\d+\.\d+$/;

function sanitizeUpdates(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return {
    ...(Number.isFinite(raw.lastCheckMs) && raw.lastCheckMs >= 0 ? { lastCheckMs: raw.lastCheckMs } : {}),
    ...(typeof raw.skipVersion === 'string' && VERSION.test(raw.skipVersion) ? { skipVersion: raw.skipVersion } : {}),
    ...(typeof raw.deleteAfterInstall === 'boolean' ? { deleteAfterInstall: raw.deleteAfterInstall } : {})
  };
}

/** US-0607 FR3.1: minutes between planning pushes (1–120); unset means PLANNING_PUSH_DEFAULT. */
export const PLANNING_PUSH_DEFAULT = 10;
const validPushMinutes = (v) => Number.isInteger(v) && v >= 1 && v <= 120;

/** US-0607 FR3.3: the docs branch for a protected `main`; unset means PLANNING_BRANCH_DEFAULT. */
export { PLANNING_BRANCH_DEFAULT } from './parsers/releases.js';

const HANDOFF_FLAGS = ['onThreshold', 'onStage', 'onGate', 'autoCompactWindow'];
const validThreshold = (v) => Number.isInteger(v) && v >= THRESHOLD_MIN && v <= THRESHOLD_MAX;

/** US-0213 FR6.1, FR6.3: the session handoff settings; each invalid field falls back to its default. */
function sanitizeHandoff(raw) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    threshold: validThreshold(r.threshold) ? r.threshold : HANDOFF_DEFAULTS.threshold,
    ...Object.fromEntries(HANDOFF_FLAGS.map((k) => [k, typeof r[k] === 'boolean' ? r[k] : HANDOFF_DEFAULTS[k]]))
  };
}

/** US-0213: a saved handoff change must be an object of known keys with valid values, or it is refused. */
function checkHandoff(partial) {
  const ok =
    partial &&
    typeof partial === 'object' &&
    !Array.isArray(partial) &&
    Object.entries(partial).every(([k, v]) => (k === 'threshold' ? validThreshold(v) : HANDOFF_FLAGS.includes(k) && typeof v === 'boolean'));
  if (!ok) throw new Error(t('errors.invalidValue', { what: 'handoff', value: JSON.stringify(partial) ?? String(partial) }));
}

/** Per-project settings keyed by project root (EPIC-06 FR3.4); invalid values fall back to the defaults. */
function sanitizeProject(raw) {
  const tabs = sanitizeHarnessTabs(raw?.harnessTabs);
  return {
    featureDocs: FEATURE_DOCS.has(raw?.featureDocs) ? raw.featureDocs : PROJECT_DEFAULTS.featureDocs,
    featuresPath: isValidFeaturesPath(raw?.featuresPath) ? raw.featuresPath : PROJECT_DEFAULTS.featuresPath,
    // "Agent-terminal" (EPIC-08 US-0801 FR2.3); left out when invalid, so the detected default applies.
    ...(selectableHarness(raw?.harness) ? { harness: raw.harness } : {}),
    ...(tabs ? { harnessTabs: tabs } : {}),
    // "Releases / Continuous deployment" (US-0603 FR1.1); left out when unset or invalid, so DELIVERY_DEFAULT applies.
    ...(DELIVERY.includes(raw?.delivery) ? { delivery: raw.delivery } : {}),
    // "Model profiles" (US-0210 FR1.5); left out until saved.
    ...(raw?.modelProfiles !== undefined ? { modelProfiles: sanitizeModelProfiles(raw.modelProfiles) } : {}),
    // The docs branch (US-0607 FR3.3); left out when unset or invalid, so PLANNING_BRANCH_DEFAULT applies.
    ...(isValidBranchName(raw?.planningBranch) ? { planningBranch: raw.planningBranch } : {}),
    // The project's rate table (US-0211 FR1.2); left out when unset, cleared or invalid, so the settings files decide.
    ...(raw?.ratesPath && isValidRatesPath(raw.ratesPath) ? { ratesPath: raw.ratesPath } : {}),
    // The session handoff (US-0213 FR6.1); left out until saved, so HANDOFF_DEFAULTS apply where it is read.
    ...(raw?.handoff !== undefined ? { handoff: sanitizeHandoff(raw.handoff) } : {})
  };
}

function sanitize(raw) {
  const projects = raw?.projectSettings && typeof raw.projectSettings === 'object' ? raw.projectSettings : {};
  const toolPaths = sanitizeToolPaths(raw?.toolPaths);
  const updates = sanitizeUpdates(raw?.updates);
  const listFolded = sanitizeListFolded(raw?.listFolded);
  return {
    openProjects: stringList(raw?.openProjects),
    recentProjects: stringList(raw?.recentProjects),
    activeProject: typeof raw?.activeProject === 'string' ? raw.activeProject : null,
    // Left out when missing or invalid, so the renderer's default (Full, or Dämpad under reduced motion) applies.
    ...(ANIMATIONS.has(raw?.animations) ? { animations: raw.animations } : {}),
    // The window's last mode, saved by main (EPIC-04 US-0404 FR1.3); left out unless it is a boolean.
    ...(typeof raw?.fullscreen === 'boolean' ? { fullscreen: raw.fullscreen } : {}),
    // Waiting-question alerts and the notification sound (US-0505 FR4.1); left out when invalid, so the
    // defaults (popup-notify, sound on) apply where they are read.
    ...(QUESTION_ALERTS.has(raw?.questionAlerts) ? { questionAlerts: raw.questionAlerts } : {}),
    ...(REPLY_ALERTS.has(raw?.replyAlerts) ? { replyAlerts: raw.replyAlerts } : {}),
    ...(typeof raw?.notificationSound === 'boolean' ? { notificationSound: raw.notificationSound } : {}),
    // "Språk / Language" (EPIC-07 US-0701 FR4.3); left out when invalid, so auto applies.
    ...(LANGUAGE_SETTINGS.includes(raw?.language) ? { language: raw.language } : {}),
    // The last Settings tab (US-0410 FR5.1); left out when invalid, so Settings opens on Tools.
    ...(SETTINGS_TABS.includes(raw?.settingsTab) ? { settingsTab: raw.settingsTab } : {}),
    // The chosen tool paths and the default project folder (EPIC-04 US-0405 FR2.4, FR4.1, FR7.1, FR7.3):
    // absolute paths only, and each key is left out when it holds nothing usable.
    ...(Object.keys(toolPaths).length ? { toolPaths } : {}),
    ...(isStoredPath(raw?.defaultProjectFolder) ? { defaultProjectFolder: raw.defaultProjectFolder } : {}),
    // The update check's memory (US-0407); left out when empty, so UPDATE_DEFAULTS apply where it is read.
    ...(Object.keys(updates).length ? { updates } : {}),
    // Minutes between release planning pushes (US-0607 FR3.1); left out when invalid, so PLANNING_PUSH_DEFAULT applies.
    ...(validPushMinutes(raw?.planningPushMinutes) ? { planningPushMinutes: raw.planningPushMinutes } : {}),
    // The folded list columns per view (US-0415 FR5.3); left out when empty, so every list starts open.
    ...(Object.keys(listFolded).length ? { listFolded } : {}),
    // ponytail: capped at 200 projects, oldest kept; prune closed projects if that ever matters.
    projectSettings: Object.fromEntries(
      Object.entries(projects)
        .slice(0, 200)
        .map(([root, s]) => [root, sanitizeProject(s)])
    )
  };
}

// US-0506 u5 D1, PD51 (LC52): main's copy of the settings as last read or saved, so a notification decides without
// awaiting a file read. Defaults only until the first read.
let current = { ...DEFAULTS, projectSettings: {} };

/** US-0506 u5 PD51: the settings as last read or saved, synchronously. */
export const settingsNow = () => current;

export async function getSettings() {
  try {
    current = sanitize(JSON.parse(await fs.readFile(file(), 'utf8')));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Kunde inte läsa inställningar, använder standard:', err.message);
    current = { ...DEFAULTS, projectSettings: {} };
  }
  return current;
}

// Writes run one at a time, each reading what the previous one wrote, so two concurrent changes both survive (FR3.5).
let queue = Promise.resolve();

function update(change) {
  const run = queue.then(async () => {
    const next = sanitize(change(await getSettings()));
    await fs.mkdir(path.dirname(file()), { recursive: true });
    await fs.writeFile(file(), JSON.stringify(next, null, 2));
    current = next;
    return next;
  });
  queue = run.catch(() => {}); // a failed write is reported to its caller and does not block the next one
  return run;
}

export function setSettings(partial) {
  // projectSettings are only changed through setProjectSettings. `updates` is merged, so the updater's check time
  // and the Settings view's cleanup choice never overwrite each other (US-0407).
  const updates = partial?.updates && typeof partial.updates === 'object' ? partial.updates : null;
  return update((cur) => ({
    ...cur,
    ...partial,
    ...(updates ? { updates: { ...cur.updates, ...sanitizeUpdates(updates) } } : {}),
    projectSettings: cur.projectSettings
  }));
}

export async function getProjectSettings(root) {
  return (await getSettings()).projectSettings[root] ?? { ...PROJECT_DEFAULTS };
}

/** @returns {Promise<{featureDocs: 'auto'|'show'|'hide', featuresPath: string, harness?: 'claude'|'opencode'}>} */
export async function setProjectSettings(root, partial) {
  if (typeof root !== 'string' || !root) throw new Error(t('errors.projectRootMissing'));
  if (partial?.harness !== undefined && !selectableHarness(partial.harness)) {
    throw new Error(t('errors.unknownHarness', { id: String(partial.harness) }));
  }
  if (partial?.featureDocs !== undefined && !FEATURE_DOCS.has(partial.featureDocs)) {
    throw new Error(t('errors.unknownFeatureDocs', { value: String(partial.featureDocs) }));
  }
  if (partial?.delivery !== undefined && !DELIVERY.includes(partial.delivery)) {
    throw new Error(t('errors.unknownDelivery', { value: String(partial.delivery) }));
  }
  if (partial?.featuresPath !== undefined && !isValidFeaturesPath(partial.featuresPath)) {
    throw new Error(t('errors.invalidFeaturesPath', { path: String(partial.featuresPath) }));
  }
  if (partial?.harnessTabs !== undefined) {
    const tabs = sanitizeHarnessTabs(partial.harnessTabs);
    if (!tabs || tabs.length !== new Set(partial.harnessTabs).size) {
      throw new Error(t('errors.unknownHarness', { id: String(partial.harnessTabs) }));
    }
    partial = { ...partial, harnessTabs: tabs };
  }
  if (partial?.modelProfiles !== undefined) checkModelProfiles(partial.modelProfiles);
  if (partial?.planningBranch !== undefined && !isValidBranchName(partial.planningBranch)) {
    throw new Error(t('errors.invalidValue', { what: 'planningBranch', value: String(partial.planningBranch) }));
  }
  if (partial?.ratesPath !== undefined && !isValidRatesPath(partial.ratesPath)) {
    throw new Error(t('errors.invalidValue', { what: 'ratesPath', value: String(partial.ratesPath) }));
  }
  if (partial?.handoff !== undefined) checkHandoff(partial.handoff);
  const given = Object.fromEntries(Object.entries(partial ?? {}).filter(([, v]) => v !== undefined));
  const next = await update((cur) => {
    const was = cur.projectSettings[root] ?? PROJECT_DEFAULTS;
    // US-0210: modelProfiles is merged per key, so the view's save and main's `active` never overwrite each other.
    const profiles = given.modelProfiles ? { modelProfiles: { ...was.modelProfiles, ...given.modelProfiles } } : {};
    const handoff = given.handoff ? { handoff: { ...was.handoff, ...given.handoff } } : {}; // US-0213: merged per key too
    return { ...cur, projectSettings: { ...cur.projectSettings, [root]: { ...was, ...given, ...profiles, ...handoff } } };
  });
  return next.projectSettings[root];
}
