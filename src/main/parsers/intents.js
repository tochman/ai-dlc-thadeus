// Merges intents.json with the intent folders actually on disk.

const DATE_PREFIX = /^(\d{2})(\d{2})(\d{2})-/;

export function dateFromDirName(dirName) {
  const m = DATE_PREFIX.exec(dirName || '');
  return m ? `20${m[1]}-${m[2]}-${m[3]}` : null;
}

function slugFromDirName(dirName) {
  return dirName.replace(DATE_PREFIX, '');
}

const UUID_V7 = /^([0-9a-f]{8})-([0-9a-f]{4})-7[0-9a-f]{3}-/i;

/** The creation time in a UUID v7 (its first 48 bits, Unix ms), or null for anything else (US-0040 FR4.2). */
export function createdMsFromUuid(uuid) {
  const m = UUID_V7.exec(typeof uuid === 'string' ? uuid : '');
  return m ? parseInt(m[1] + m[2], 16) : null;
}

/**
 * Newest first: by folder date, then within a day by the uuid's creation time, then the intents without one
 * by folder name (US-0040 FR4.2, FR4.3).
 */
function newestFirst(a, b) {
  if (a.date !== b.date) return (b.date ?? '').localeCompare(a.date ?? '');
  if (a.createdMs !== null && b.createdMs !== null) return b.createdMs - a.createdMs;
  if (a.createdMs !== b.createdMs) return a.createdMs === null ? 1 : -1;
  return b.dirName.localeCompare(a.dirName);
}

/**
 * @param {unknown} index parsed intents.json (anything that is not an array counts as empty)
 * @param {string[]} diskDirs intent folder names found on disk
 * @param {string|null} activeDirName contents of active-intent
 */
export function mergeIntents(index, diskDirs, activeDirName) {
  const entries = Array.isArray(index) ? index.filter((e) => e && typeof e.dirName === 'string') : [];
  const onDisk = new Set(diskDirs);
  const indexed = new Set(entries.map((e) => e.dirName));

  const fromIndex = entries.map((e) => ({
    uuid: e.uuid ?? null,
    slug: e.slug ?? slugFromDirName(e.dirName),
    dirName: e.dirName,
    scope: e.scope ?? null,
    status: e.status ?? null,
    missingOnDisk: !onDisk.has(e.dirName),
    missingInIndex: false
  }));
  const diskOnly = diskDirs
    .filter((d) => !indexed.has(d))
    .map((d) => ({
      uuid: null,
      slug: slugFromDirName(d),
      dirName: d,
      scope: null,
      status: null,
      missingOnDisk: false,
      missingInIndex: true
    }));

  return [...fromIndex, ...diskOnly]
    .map((i) => ({ ...i, date: dateFromDirName(i.dirName), createdMs: createdMsFromUuid(i.uuid), active: i.dirName === activeDirName }))
    .sort(newestFirst);
}
