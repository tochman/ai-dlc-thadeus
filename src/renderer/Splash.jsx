import { useEffect, useState } from 'react';
import AuctumMark from './AuctumMark.jsx';

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
  return (
    <div className={`splash ${leaving ? 'is-leaving' : ''}`} data-testid="splash">
      <AuctumMark size={160} className="splash-mark" />
      <div className="splash-name">{APP_NAME}</div>
      <div className="splash-bar" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
