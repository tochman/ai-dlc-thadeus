// The live token view (EPIC-02 US-0207): while the intent is in flight, four glowing bar meters (input, output,
// cache write, cache read) with a level scale and their figures, and the token rate between ledger readings as a
// waveform. It updates from the existing cost refresh (US-0205's ledger watch), with no watcher of its own.
// A missing or half-written ledger keeps the last good values and says so in one sentence (NFR5). Every meter has a
// text label and its figure, so nothing is told by colour alone; the glow and the wave stop with the animations
// setting through theme.css's data-motion rules (NFR4). Style only after the person's reference (NFR3).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTokens } from './format.js';
import { HISTORY_MAX, SEGMENTS, meterLevel, pushSample, tokensOf } from './tokenFlow.js';

const METERS = ['input', 'output', 'cacheWrite', 'cacheRead'];
const WAVE_W = 240;
const WAVE_H = 48;

/** "x,y" points for the rate history, one per sample, scaled to the largest rate. */
export function wavePoints(history) {
  const top = Math.max(...history.map((s) => s.rate), 0);
  const step = WAVE_W / (HISTORY_MAX - 1);
  return history.map((s, i) => `${Math.round(i * step)},${Math.round(WAVE_H - 4 - (top > 0 ? (s.rate / top) * (WAVE_H - 8) : 0))}`).join(' ');
}

/**
 * @param {{cost: object|null, dirName: string, live: boolean}} props `cost` is what `project:cost` returns
 */
export default function TokenView({ cost, dirName, live }) {
  const { t } = useTranslation();
  const [history, setHistory] = useState([]);
  const now = tokensOf(cost, dirName);

  useEffect(() => setHistory([]), [dirName]); // another intent: a new history
  const key = now ? METERS.map((m) => now[m]).join('|') : null;
  useEffect(() => {
    if (now) setHistory((h) => pushSample(h, now, Date.now()));
  }, [key]); // a new ledger reading, not every render

  const shown = now ?? history.at(-1)?.tokens ?? null;
  if (!live || !shown) return null;
  // The ledger could not be read this time: main kept its last good summary (stale), or there is none now.
  const stale = cost?.stale ? cost.warning ?? '' : !now ? cost?.reason ?? '' : null;
  const max = Math.max(...METERS.map((m) => shown[m]));
  const rate = history.at(-1)?.rate ?? 0;

  return (
    <section className="token-view" aria-label={t('tokens.title')} data-testid="token-view">
      <h3 className="token-view-title">{t('tokens.title')}</h3>
      <div className="token-meters">
        {METERS.map((m) => {
          const { level, scale } = meterLevel(shown[m], max);
          return (
            <div key={m} className="token-meter" data-testid={`token-meter-${m}`}>
              <span className="token-meter-scale" aria-hidden="true">
                <span>{formatTokens(scale)}</span>
                <span>0</span>
              </span>
              <span className="token-meter-bar" aria-hidden="true" data-level={level}>
                {Array.from({ length: SEGMENTS }, (_, i) => (
                  <span key={i} className={`token-seg${SEGMENTS - i <= level ? ' is-lit' : ''}`} />
                ))}
              </span>
              <span className="token-meter-label">{t(`tokens.${m}`)}</span>
              <span className="token-meter-value" data-testid={`token-value-${m}`}>
                {formatTokens(shown[m])}
              </span>
            </div>
          );
        })}
      </div>
      <figure className="token-wave">
        <svg viewBox={`0 0 ${WAVE_W} ${WAVE_H}`} preserveAspectRatio="none" role="img" aria-label={t('tokens.waveLabel', { n: history.length })}>
          <polyline className="token-wave-line" points={wavePoints(history)} data-testid="token-wave" />
        </svg>
        <figcaption>{t('tokens.rate', { rate: formatTokens(Math.round(rate)) })}</figcaption>
      </figure>
      {stale !== null && (
        <p className="token-view-stale" role="status" data-testid="token-view-stale">
          {t('cost.stale', { warning: stale })}
        </p>
      )}
    </section>
  );
}
