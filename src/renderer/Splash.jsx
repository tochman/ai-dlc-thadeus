import { useEffect, useState } from 'react';
import AuctumMark from './AuctumMark.jsx';
import { Bar } from './Lcars.jsx';

export const APP_NAME = 'Auctum AIDLC Control';
export const SPLASH_MIN_MS = 900;
export const SPLASH_MAX_MS = 4000;
export const SPLASH_FADE_MS = 300;

// Startup splash: stays until `ready` (tabs restored), but at least MIN and at most MAX ms, then fades out.
// It holds no focusable elements and stops catching pointer events while fading, so it never traps focus.
export default function Splash({ ready }) {
  const [minDone, setMinDone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [gone, setGone] = useState(false);
  const leaving = (ready && minDone) || timedOut;

  useEffect(() => {
    const min = setTimeout(() => setMinDone(true), SPLASH_MIN_MS);
    const max = setTimeout(() => setTimedOut(true), SPLASH_MAX_MS);
    return () => {
      clearTimeout(min);
      clearTimeout(max);
    };
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setGone(true), SPLASH_FADE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  if (gone) return null;
  // The mockup's Splash: frames and bars draw out (≤ 600 ms) around the big amber mark with its slow glow.
  // The name is read once from the hidden full text; the two-line lettering is decoration.
  return (
    <div className={`splash ${leaving ? 'is-leaving' : ''}`} data-testid="splash">
      <div className="splash-top" aria-hidden="true">
        <span className="splash-cap" />
        <Bar segs={[['slate-3', 3], ['steel-deep', 90], ['slate-4', 1]]} />
      </div>
      <div className="splash-mid">
        <div className="splash-arm" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="splash-center">
          <AuctumMark size={300} className="splash-mark" />
          <div className="splash-name" aria-hidden="true">
            <span className="splash-name-main">Auctum</span>
            <span className="splash-name-sub">Aidlc control</span>
          </div>
          <span className="sr-only">{APP_NAME}</span>
          <div className="splash-line" aria-hidden="true">
            <span />
            <span />
          </div>
        </div>
      </div>
      <Bar className="splash-bottom" segs={[['slate-2', 2], ['steel-deep', 70], ['slate-3', 1]]} />
    </div>
  );
}
