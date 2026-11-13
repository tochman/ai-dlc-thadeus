// Merges intents.json with the intent folders actually on disk.

const DATE_PREFIX = /^(\d{2})(\d{2})(\d{2})-/;

export function dateFromDirName(dirName) {
  const m = DATE_PREFIX.exec(dirName || '');
  return m ? `20${m[1]}-${m[2]}-${m[3]}` : null;
}

function slugFromDirName(dirName) {
  return dirName.replace(DATE_PREFIX, '');
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
    .map((i) => ({ ...i, date: dateFromDirName(i.dirName), active: i.dirName === activeDirName }))
    .sort((a, b) => b.dirName.localeCompare(a.dirName));
}
