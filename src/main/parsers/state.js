// Parses aidlc-state.md: `## Section` blocks of `- **Key**: value` lines, and the
// `### <NAME> PHASE` stage checkbox lists under Stage Progress.

export const CHECKBOX_STATUS = {
  ' ': 'not-started',
  '-': 'in-progress',
  '?': 'awaiting-approval',
  R: 'revising',
  x: 'done',
  S: 'skipped'
};

const SECTION = /^##\s+(.+?)\s*$/;
const PHASE = /^###\s+(.+?)\s+PHASE\s*$/i;
const FIELD = /^-\s+\*\*(.+?)\*\*:\s?(.*)$/;
const STAGE = /^-\s+\[(.)\]\s+([\w.-]+)\s*(?:[—–-]+\s*(EXECUTE|SKIP))?\s*$/;

export function parseState(text) {
  const sections = {};
  const phases = [];
  let section = null;
  let phase = null;

  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    let m;
    if ((m = PHASE.exec(line))) {
      phase = { name: m[1].toLowerCase(), stages: [] };
      phases.push(phase);
    } else if ((m = SECTION.exec(line))) {
      section = m[1];
      sections[section] = sections[section] || {};
      phase = null;
    } else if (phase && (m = STAGE.exec(line))) {
      phase.stages.push({
        slug: m[2],
        status: CHECKBOX_STATUS[m[1]] ?? 'unknown',
        mode: m[3] ?? 'EXECUTE'
      });
    } else if (section && (m = FIELD.exec(line))) {
      sections[section][m[1]] = m[2].trim();
    }
  }

  const info = sections['Project Information'] || {};
  const scopeCfg = sections['Scope Configuration'] || {};
  const current = sections['Current Status'] || {};
  return {
    sections,
    project: info.Project ?? null,
    scope: info.Scope ?? null,
    // A custom plan's name; Scope then holds the base plan it was built on.
    plan: info.Plan || null,
    startDate: info['Start Date'] ?? null,
    depth: scopeCfg.Depth ?? null,
    testStrategy: scopeCfg['Test Strategy'] ?? null,
    currentStage: current['Current Stage'] ?? null,
    currentStatus: current.Status ?? null,
    archivedFrom: current['Archived From'] ?? null, // US-0513 FR6.2: the Status an archive replaced
    lastUpdated: current['Last Updated'] ?? null,
    phases
  };
}
