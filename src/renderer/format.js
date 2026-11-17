// Display helpers shared by the views. Status is always rendered as text as well as colour (FR9.3).
// Texts come from the translation files (EPIC-07 US-0701); dates and numbers follow the chosen language.
import { cloneElement } from 'react';
import i18n, { locale, t } from '../shared/i18n.js';

/** The translated label `<group>.<id>`, or null when there is none (an unknown status is shown as it is). */
const labelOf = (group, id) => (id != null && i18n.exists(`${group}.${id}`) ? t(`${group}.${id}`) : null);

export const stageStatusLabel = (status) => labelOf('common.stageStatus', status);
export const unitStatusLabel = (status) => labelOf('common.unitStatus', status);
export const categoryLabel = (category) => labelOf('common.category', category);

export function formatTime(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(locale(), { dateStyle: 'short', timeStyle: 'medium' });
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
export const stageTitle = (slug) =>
  String(slug)
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

/** Where resuming picks up: the current stage and its step among the executed stages (FR2.5). */
export function stagePosition(currentStage, done, executed) {
  if (!currentStage) return null;
  return { stage: stageTitle(currentStage), step: Math.min((done ?? 0) + 1, executed || 1), total: executed || 0 };
}

// Cost is AI-DLC's own estimate (tokens x API price), never an invoice (FR6.1).
// ponytail: USD keeps its own "$1.23" form in every language; switch to Intl currency if a reader asks for it.
export function formatUsd(n) {
  return n == null || !Number.isFinite(n) ? '–' : `$${n.toFixed(2)}`;
}

/** USD, or "pris saknas" when tokens were used but the ledger has no price (FR6.2). */
export const formatCost = (c) => (!c ? '–' : c.missingPrice ? t('cost.missingPrice') : formatUsd(c.usd));

const cents = (n) => Math.round(n * 100);

/** US-0211 FR3.1: the current-price USD when it differs from the recorded figure by $0.01 or more (or that has no price), else null. */
export function currentUsdOf(c) {
  if (!c || c.currentUsd == null || !Number.isFinite(c.currentUsd)) return null;
  return !c.missingPrice && cents(c.usd) === cents(c.currentUsd) ? null : c.currentUsd;
}

/** US-0211 FR3.1: "recorded $12.40 · at current prices $9.80", or the recorded figure alone when they agree. */
export function formatCostPair(c) {
  const current = currentUsdOf(c);
  return current == null ? formatCost(c) : t('cost.reprice.pair', { recorded: formatCost(c), current: formatUsd(current) });
}

/** US-0211 AC1.4.3: the tooltip line for compact places (list rows, chart points), or null when the figures agree. */
export function currentTip(c) {
  const current = currentUsdOf(c);
  return current == null ? null : t('cost.reprice.tip', { current: formatUsd(current) });
}

const oneDecimal = (n) => n.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatTokens(n) {
  if (n == null || !Number.isFinite(n)) return '–';
  if (n < 1000) return String(n);
  if (n < 1e6) return `${oneDecimal(n / 1e3)} k`;
  return `${oneDecimal(n / 1e6)} M`;
}

export const tokenBreakdown = (tk) =>
  t('cost.breakdown', {
    input: formatTokens(tk.input),
    output: formatTokens(tk.output),
    cacheWrite: formatTokens(tk.cacheWrite),
    cacheRead: formatTokens(tk.cacheRead)
  });

const SLOT = '\u0000';

/**
 * A translated text with React elements in place of its placeholders, e.g. `{path}` as a <code> element.
 * The text stays plain text: nothing in it is parsed as markup (NFR4).
 * @param {string} key @param {Record<string, import('react').ReactElement>} elements
 */
export function withSlots(key, elements) {
  const names = Object.keys(elements);
  const values = Object.fromEntries(names.map((name, i) => [name, `${SLOT}${i}${SLOT}`]));
  return t(key, values)
    .split(SLOT)
    .map((part, i) => (i % 2 ? cloneElement(elements[names[Number(part)]], { key: i }) : part));
}
