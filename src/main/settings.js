// The app's own settings file in userData. This is the only file the app ever writes,
// and it is never an AI-DLC file.
import { app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DEFAULT_FEATURES_PATH, isValidFeaturesPath } from './parsers/features.js';
import { LANGUAGE_SETTINGS, t } from '../shared/i18n.js';
import { selectableHarness } from '../shared/harnesses.js';

const DEFAULTS = { openProjects: [], recentProjects: [], activeProject: null, projectSettings: {} };
export const PROJECT_DEFAULTS = { featureDocs: 'auto', featuresPath: DEFAULT_FEATURES_PATH };
const FEATURE_DOCS = new Set(['auto', 'show', 'hide']);
const ANIMATIONS = new Set(['full', 'reduced', 'off']); // "Animationer: Full / Dämpad / Av" (EPIC-04 FR4.2)
// "Frågor från Claude: Popup och notis / Bara popup / Av" (EPIC-05 US-0505 FR4.1); unset means popup-notify.
export const QUESTION_ALERTS = new Set(['popup-notify', 'popup', 'off']);
const file = () => path.join(app.getPath('userData'), 'settings.json');

const stringList = (v) => (Array.isArray(v) ? v.filter((s) => typeof s === 'string').slice(0, 50) : []);

/** Per-project settings keyed by project root (EPIC-06 FR3.4); invalid values fall back to the defaults. */
function sanitizeProject(raw) {
  return {
    featureDocs: FEATURE_DOCS.has(raw?.featureDocs) ? raw.featureDocs : PROJECT_DEFAULTS.featureDocs,
    featuresPath: isValidFeaturesPath(raw?.featuresPath) ? raw.featuresPath : PROJECT_DEFAULTS.featuresPath,
    // "Agent-terminal" (EPIC-08 US-0801 FR2.3); left out when invalid, so the detected default applies.
    ...(selectableHarness(raw?.harness) ? { harness: raw.harness } : {})
  };
}

function sanitize(raw) {
  const projects = raw?.projectSettings && typeof raw.projectSettings === 'object' ? raw.projectSettings : {};
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
    ...(typeof raw?.notificationSound === 'boolean' ? { notificationSound: raw.notificationSound } : {}),
    // "Språk / Language" (EPIC-07 US-0701 FR4.3); left out when invalid, so auto applies.
    ...(LANGUAGE_SETTINGS.includes(raw?.language) ? { language: raw.language } : {}),
    // ponytail: capped at 200 projects, oldest kept; prune closed projects if that ever matters.
    projectSettings: Object.fromEntries(
      Object.entries(projects)
        .slice(0, 200)
        .map(([root, s]) => [root, sanitizeProject(s)])
    )
  };
}

export async function getSettings() {
  try {
    return sanitize(JSON.parse(await fs.readFile(file(), 'utf8')));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Kunde inte läsa inställningar, använder standard:', err.message);
    return { ...DEFAULTS, projectSettings: {} };
  }
}

// Writes run one at a time, each reading what the previous one wrote, so two concurrent changes both survive (FR3.5).
let queue = Promise.resolve();

function update(change) {
  const run = queue.then(async () => {
    const next = sanitize(change(await getSettings()));
    await fs.mkdir(path.dirname(file()), { recursive: true });
    await fs.writeFile(file(), JSON.stringify(next, null, 2));
    return next;
  });
  queue = run.catch(() => {}); // a failed write is reported to its caller and does not block the next one
  return run;
}

export function setSettings(partial) {
  // projectSettings are only changed through setProjectSettings.
  return update((cur) => ({ ...cur, ...partial, projectSettings: cur.projectSettings }));
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
  if (partial?.featuresPath !== undefined && !isValidFeaturesPath(partial.featuresPath)) {
    throw new Error(t('errors.invalidFeaturesPath', { path: String(partial.featuresPath) }));
  }
  const given = Object.fromEntries(Object.entries(partial ?? {}).filter(([, v]) => v !== undefined));
  const next = await update((cur) => ({
    ...cur,
    projectSettings: {
      ...cur.projectSettings,
      [root]: { ...(cur.projectSettings[root] ?? PROJECT_DEFAULTS), ...given }
    }
  }));
  return next.projectSettings[root];
}
