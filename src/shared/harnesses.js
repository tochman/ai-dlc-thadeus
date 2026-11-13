// The fixed harness table (EPIC-08 US-0801). Pure, so main (pty, detection, settings) and the renderer
// (tab label, commands) read the same entries. Only `selectable` ids ever reach the pty (FR3.3, NFR4).
//
// Adding a harness: one entry here with its folder markers, its CLI and its `commands` (the way it runs
// AI-DLC); set `selectable: true` once the agent tab has been checked against it. `quietMs` overrides the
// shared 1.5 s quiet rule that marks the tab as ready (FR4.3).

export const HARNESSES = [
  {
    id: 'claude',
    label: 'Claude Code',
    name: 'Claude',
    cli: 'claude',
    selectable: true,
    markers: { dirs: ['.claude'] },
    commands: { aidlc: '/aidlc' }
  },
  {
    id: 'opencode',
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
  { id: 'codex', label: 'Codex', name: 'Codex', cli: 'codex', selectable: false, markers: { dirs: ['.codex'] }, commands: {} },
  { id: 'kiro', label: 'Kiro', name: 'Kiro', cli: 'kiro-cli', selectable: false, markers: { dirs: ['.kiro'] }, commands: {} },
  { id: 'cursor', label: 'Cursor', name: 'Cursor', cli: null, selectable: false, markers: { dirs: ['.cursor'] }, commands: {} },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    name: 'Copilot',
    cli: null,
    selectable: false,
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
 * The harness the agent tab runs (FR2.2): a valid saved choice, else the only installed selectable harness,
 * else Claude Code. `detected` is detectHarnesses' list, or null while it runs.
 */
export function resolveHarness(setting, detected) {
  if (selectableHarness(setting)) return setting;
  const installed = (detected ?? []).filter((d) => d.installed && selectableHarness(d.id));
  return installed.length === 1 ? installed[0].id : DEFAULT_HARNESS;
}

/** The AI-DLC command for `harness` (a table entry) with `suffix`, or null when its table lacks it (FR4.2). */
export function harnessCommand(harness, suffix = '') {
  const base = harness?.commands?.aidlc;
  return base ? base + suffix : null;
}
