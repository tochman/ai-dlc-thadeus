// US-0417: the one LCARS dialog frame (About, Update). A native modal <dialog> over the dimmed app holding a
// RoundFrame: the app's brand corner (the amber mark and the name, as in the shell), the title on the 30 px bar with
// Close as its last pill, readout blocks in the arm, a circular bottom elbow. Esc and a click on the backdrop close
// it, and focus goes back to where it was. The shared entrance runs each time it opens.
import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import AuctumMark from './AuctumMark.jsx';
import { BARS, Pill, RoundFrame, useEntrance } from './Lcars.jsx';
import { APP_NAME } from '../shared/appName.js';

/**
 * @param {{open: boolean, onClose: () => void, title: import('react').ReactNode, sub?: import('react').ReactNode,
 *          readouts?: Array<{k: import('react').ReactNode, v: import('react').ReactNode, key?: boolean}>,
 *          footer?: import('react').ReactNode, testId: string, className?: string, children?: import('react').ReactNode}} props
 *   readouts: the arm's blocks; `key` marks the one key value (white on steel)
 *   testId: the dialog's data-testid; its Close pill is `${testId}-close`
 */
export default function LcarsDialog({ open, onClose, title, sub, readouts = [], footer, testId, className = '', children }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const returnFocus = useRef(null);
  const titleId = useId();
  const entering = useEntrance(open ? 'open' : 'shut');

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      returnFocus.current = document.activeElement;
      d.showModal ? d.showModal() : d.setAttribute('open', '');
    }
    if (!open && d.open) {
      d.close ? d.close() : d.removeAttribute('open');
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
      returnFocus.current = null;
    }
  }, [open]);

  const arm = readouts.map((r, i) => (
    <div
      key={i}
      className={`lcars-dblk ${r.key ? 'lcars-dblk--steel' : 'lcars-dblk--deep'} lcars-e-block`}
      style={{ '--i': i }}
      data-testid="lcars-dialog-readout"
    >
      <span className="lcars-dblk-k">{r.k}</span>
      <span className="lcars-dblk-v">{r.v}</span>
    </div>
  ));

  return (
    <dialog
      ref={ref}
      className={`lcars-dlg ${className}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      // The frame fills the dialog, so a click on the dialog element itself is a click on the backdrop.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid={testId}
    >
      {open && (
        <div className={`lcars-dlg-box${entering ? ' is-entering' : ''}`}>
          <RoundFrame
            title={title}
            titleId={titleId}
            sub={sub}
            arm={BARS.thick}
            top={BARS.medium}
            bottom={BARS.thin}
            corner={
              <span className="lcars-dlg-brand" data-testid="lcars-dialog-brand">
                <AuctumMark size={38} className="app-mark" decorative />
                <span className="app-brand-text">{APP_NAME}</span>
              </span>
            }
            armContent={arm.length ? arm : null}
            footer={footer}
            trailing={
              <Pill onClick={onClose} data-testid={`${testId}-close`}>
                {t('common.close')}
              </Pill>
            }
          >
            {children}
          </RoundFrame>
        </div>
      )}
    </dialog>
  );
}
