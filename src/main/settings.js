// The app's own settings file in userData. This is the only file the app ever writes,
// and it is never an AI-DLC file.
import { app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const DEFAULTS = { openProjects: [], recentProjects: [], activeProject: null };
const file = () => path.join(app.getPath('userData'), 'settings.json');

const stringList = (v) => (Array.isArray(v) ? v.filter((s) => typeof s === 'string').slice(0, 50) : []);

function sanitize(raw) {
  return {
    openProjects: stringList(raw?.openProjects),
    recentProjects: stringList(raw?.recentProjects),
    activeProject: typeof raw?.activeProject === 'string' ? raw.activeProject : null
  };
}

export async function getSettings() {
  try {
    return sanitize(JSON.parse(await fs.readFile(file(), 'utf8')));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Kunde inte läsa inställningar, använder standard:', err.message);
    return { ...DEFAULTS };
  }
}

export async function setSettings(partial) {
  const next = sanitize({ ...(await getSettings()), ...partial });
  await fs.mkdir(path.dirname(file()), { recursive: true });
  await fs.writeFile(file(), JSON.stringify(next, null, 2));
  return next;
}
