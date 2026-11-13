// Display helpers shared by the views. Status is always rendered as text as well as colour (FR9.3).

export const STAGE_STATUS_LABEL = {
  'not-started': 'Ej startad',
  'in-progress': 'Pågår',
  'awaiting-approval': 'Väntar på godkännande',
  revising: 'Revideras',
  done: 'Klar',
  skipped: 'Överhoppad',
  unknown: 'Okänd'
};

export const UNIT_STATUS_LABEL = { pending: 'Väntar', running: 'Pågår', done: 'Klar' };

export const CATEGORY_LABEL = {
  stage: 'Stage',
  subagent: 'Subagent',
  gate: 'Gate',
  human: 'Människa',
  unit: 'Unit',
  error: 'Fel',
  guard: 'Guard/sensor',
  other: 'Övrigt'
};

export function formatTime(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'medium' });
}

export function formatDuration(ms) {
  if (ms == null || !Number.isFinite(ms)) return '–';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${s % 60} s`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export const isInFlight = (status) => status === 'in-flight';

/** "claude-opus-5-5" -> "opus-5-5", as the readouts show model names. */
export const shortModel = (name) => String(name).replace(/^claude-/, '');

/** "code-generation" -> "Code Generation" */
export const stageTitle = (slug) => String(slug).split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

/** Where resuming picks up: the current stage and its step among the executed stages (FR2.5). */
export function stagePosition(currentStage, done, executed) {
  if (!currentStage) return null;
  return { stage: stageTitle(currentStage), step: Math.min((done ?? 0) + 1, executed || 1), total: executed || 0 };
}

// Cost is AI-DLC's own estimate (tokens x API price), never an invoice (FR6.1).
export const COST_LABEL = 'Uppskattad kostnad (API-pris)';
export const COST_EXPLANATION =
  'Beräknad av AI-DLC från förbrukade tokens gånger API-priset per modell (USD). Det är ingen faktura och inte vad en prenumeration faktiskt kostar.';
export const NO_COST_ENTRY = 'Ingen post i usage-ledger.json för den här intenten.';
export const MISSING_PRICE = 'pris saknas';

export function formatUsd(n) {
  return n == null || !Number.isFinite(n) ? '–' : `$${n.toFixed(2)}`;
}

/** USD, or "pris saknas" when tokens were used but the ledger has no price (FR6.2). */
export const formatCost = (c) => (!c ? '–' : c.missingPrice ? MISSING_PRICE : formatUsd(c.usd));

export function formatTokens(n) {
  if (n == null || !Number.isFinite(n)) return '–';
  if (n < 1000) return String(n);
  if (n < 1e6) return `${(n / 1e3).toFixed(1)} k`;
  return `${(n / 1e6).toFixed(1)} M`;
}

export const tokenBreakdown = (t) =>
  `input ${formatTokens(t.input)} · output ${formatTokens(t.output)} · cache write ${formatTokens(t.cacheWrite)} · cache read ${formatTokens(t.cacheRead)}`;
