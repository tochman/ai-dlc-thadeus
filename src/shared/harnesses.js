// The fixed harness table (EPIC-08 US-0801). Pure, so main (pty, detection, settings) and the renderer
// (tab label, commands) read the same entries. Only `selectable` ids ever reach the pty (FR3.3, NFR4).
//
// Adding a harness: one entry here with its folder markers, its CLI and its `commands` (the way it runs
// AI-DLC); set `selectable: true` once the agent tab has been checked against it. `quietMs` overrides the
// shared 1.5 s quiet rule that marks the tab as ready (FR4.3).

export const HARNESSES = [
  {
    id: 'claude',
    setupId: 'claude',
    label: 'Claude Code',
    name: 'Claude',
    cli: 'claude',
    selectable: true,
    markers: { dirs: ['.claude'] },
    commands: { aidlc: '/aidlc' },
    // Its question picker selects an option by its number key, so the question popup can answer it.
    // opencode's picker keys are unconfirmed: there the popup offers its own free text only.
    pickerKeys: true
  },
  {
    id: 'opencode',
    setupId: 'opencode',
    label: 'opencode',
    name: 'opencode',
    cli: 'opencode',
    selectable: true,
    // AI-DLC for opencode lives in .aidlc/ and adds its entries to opencode.json (its /aidlc command is
    // .opencode/command/aidlc.md).
    markers: { dirs: ['.aidlc'], files: ['.opencode/command/aidlc.md'], jsonWithAidlc: ['opencode.json', 'opencode.jsonc'] },
    commands: { aidlc: '/aidlc' },
    // Measured against opencode v2.1.4: after its first quiet period at start it redraws once more 3.0–3.6 s
    // later. A 4 s quiet keeps "ready" from firing before that.
    quietMs: 4000
  },
  { id: 'codex', setupId: 'codex', label: 'Codex', name: 'Codex', cli: 'codex', selectable: false, markers: { dirs: ['.codex'] }, commands: {} },
  { id: 'kiro', setupId: 'kiro', label: 'Kiro', name: 'Kiro', cli: 'kiro-cli', selectable: false, markers: { dirs: ['.kiro'] }, commands: {} },
  // perAgentModels: false — the session or IDE picker chooses the model (US-0901 FR4.4).
  {
    id: 'cursor',
    setupId: 'cursor',
    label: 'Cursor',
    name: 'Cursor',
    cli: null,
    selectable: false,
    perAgentModels: false,
    markers: { dirs: ['.cursor'] },
    commands: {}
  },
  {
    id: 'copilot',
    setupId: 'copilot',
    label: 'GitHub Copilot',
    name: 'Copilot',
    cli: null,
    selectable: false,
    perAgentModels: false,
    // .github/ alone is any GitHub repo; only AI-DLC's own files there count.
    markers: { dirs: ['.github/skills/aidlc'], files: ['.github/hooks/aidlc.json'] },
    commands: {}
  }
];

export const DEFAULT_HARNESS = 'claude';

/** The selectable table entry for `id`, or null for anything else (unknown, not supported yet, not a string). */
export function selectableHarness(id) {
  return HARNESSES.find((h) => h.selectable && h.id === id) ?? null;
}

/**
 * The table entry AI-DLC setup can install for `id` (all six, US-0802 FR1.1), or null for anything else.
 * Only its `setupId` reaches `aidlc config --harness` (FR1.4).
 */
export function setupHarness(id) {
  return HARNESSES.find((h) => h.setupId && h.id === id) ?? null;
}

/**
 * The harness setup starts on (US-0802 FR1.2): the only one whose CLI was found, else Claude Code, else the
 * first found. With `add`, installed harnesses are left out (FR3.1). `detected` is detectHarnesses' list or null.
 */
export function defaultSetupHarness(detected, { add = false } = {}) {
  const byId = Object.fromEntries((detected ?? []).map((d) => [d.id, d]));
  const open = HARNESSES.filter((h) => h.setupId && !(add && byId[h.id]?.installed));
  const found = open.filter((h) => byId[h.id]?.cli?.found);
  const pick = found.length === 1 ? found[0] : (open.find((h) => h.id === DEFAULT_HARNESS) ?? found[0] ?? open[0]);
  return pick?.id ?? null;
}

/**
 * The harness the agent tab runs (FR2.2): a valid saved choice, else the only installed selectable harness,
 * else Claude Code. `detected` is detectHarnesses' list, or null while it runs.
 */
export function resolveHarness(setting, detected) {
  if (selectableHarness(setting)) return setting;
  const installed = (detected ?? []).filter((d) => d.installed && selectableHarness(d.id));
  return installed.length === 1 ? installed[0].id : DEFAULT_HARNESS;
}

/** The folder with the harness's shipped plans: `<first marker dir>/scopes`, e.g. `.claude/scopes` (US-0901 FR3.1). */
export function scopesDir(entry) {
  const dir = entry?.markers?.dirs?.[0];
  return dir ? `${dir}/scopes` : null;
}

/** The AI-DLC command for `harness` (a table entry) with `suffix`, or null when its table lacks it (FR4.2). */
export function harnessCommand(harness, suffix = '') {
  const base = harness?.commands?.aidlc;
  return base ? base + suffix : null;
}
