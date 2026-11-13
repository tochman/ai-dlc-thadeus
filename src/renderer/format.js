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
