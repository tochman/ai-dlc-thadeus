// The app's own settings file in userData. This is the only file the app ever writes,
// and it is never an AI-DLC file.
import { app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DEFAULT_FEATURES_PATH, isValidFeaturesPath } from './parsers/features.js';

const DEFAULTS = { openProjects: [], recentProjects: [], activeProject: null, projectSettings: {} };
export const PROJECT_DEFAULTS = { featureDocs: 'auto', featuresPath: DEFAULT_FEATURES_PATH };
const FEATURE_DOCS = new Set(['auto', 'show', 'hide']);
const ANIMATIONS = new Set(['full', 'reduced', 'off']); // "Animationer: Full / Dämpad / Av" (EPIC-04 FR4.2)
const file = () => path.join(app.getPath('userData'), 'settings.json');

const stringList = (v) => (Array.isArray(v) ? v.filter((s) => typeof s === 'string').slice(0, 50) : []);

/** Per-project settings keyed by project root (EPIC-06 FR3.4); invalid values fall back to the defaults. */
function sanitizeProject(raw) {
  return {
    featureDocs: FEATURE_DOCS.has(raw?.featureDocs) ? raw.featureDocs : PROJECT_DEFAULTS.featureDocs,
    featuresPath: isValidFeaturesPath(raw?.featuresPath) ? raw.featuresPath : PROJECT_DEFAULTS.featuresPath
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

/** @returns {Promise<{featureDocs: 'auto'|'show'|'hide', featuresPath: string}>} */
export async function setProjectSettings(root, partial) {
  if (typeof root !== 'string' || !root) throw new Error('Projektroten saknas');
  if (partial?.featureDocs !== undefined && !FEATURE_DOCS.has(partial.featureDocs)) {
    throw new Error(`Okänt värde för feature-beskrivningar: ${partial.featureDocs}`);
  }
  if (partial?.featuresPath !== undefined && !isValidFeaturesPath(partial.featuresPath)) {
    throw new Error(`Ogiltig sökväg: ${partial.featuresPath}. Den ska vara relativ, sluta på .md och ligga i projektet.`);
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
