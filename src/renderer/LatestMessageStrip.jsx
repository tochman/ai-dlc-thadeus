// US-0506 u3 US3.1, BR6.15, BR6.16, SD11, D11; US-0018: the latest-message strip above the hidden terminal. One line per
// project: the newest reply of any of its agent tabs (main's LatestMessage, C4 agentEvents.latest), refetched on each
// agent-events:changed push for this project. Answer reopens the reply in the dialog (App, K11); Show opens a
// read-only view of the kept text with Close only (W9). The line is the first non-empty line, cleaned (review R-06)
// and rendered as inline Markdown, so it adds no block element and cannot reorder the tab name beside it.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { firstLine, stripUnsafe } from '../shared/agentText.js';
import { selectableHarness } from '../shared/harnesses.js';
import { FileContent } from './ArtifactReader.jsx';
import { ReplyMessage } from './ReplyPage.jsx';
import { useTerminal } from './TerminalContext.jsx';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const MARK = { answered: 'latestMessage.answered', sessionEnded: 'latestMessage.sessionEnded', notShown: 'latestMessage.notShown' };

export default function LatestMessageStrip({ projectId, onOpenReply }) {
  const { t } = useTranslation();
  const terminal = useTerminal(); // null outside a TerminalProvider (then the line shows)
  const [latest, setLatest] = useState(null);
  const [viewing, setViewing] = useState(false);
  const viewRef = useRef(null);

  useEffect(() => {
    const bridge = window.bridge?.agentEvents;
    if (!bridge?.latest) return undefined; // without the agent bridge there are no replies (BR6.18)
    let gone = false;
    const fetch = () =>
      bridge
        .latest(projectId)
        .then((l) => !gone && setLatest(l ?? null))
        .catch((err) => console.warn('Senaste meddelandet kunde inte läsas:', errorText(err)));
    fetch();
    const off = bridge.onChanged?.((change) => change?.projectId === projectId && fetch());
    return () => {
      gone = true;
      off?.();
    };
  }, [projectId]);

  useEffect(() => {
    const d = viewRef.current;
    if (!d) return;
    if (viewing && !d.open) d.showModal ? d.showModal() : d.setAttribute('open', '');
    if (!viewing && d.open) d.close ? d.close() : d.removeAttribute('open');
  }, [viewing]);

  // US-0018: screen space is scarce. The open terminal already shows the reply, and "no message yet" says nothing,
  // so the line shows only with a message and the terminal hidden.
  if (!latest || terminal?.view.open) return null;

  const harnessLabel = selectableHarness(latest.harness)?.label ?? latest.harness;
  const time = new Date(latest.arrivedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="latest-message" aria-label={t('latestMessage.label')} data-testid="latest-message-strip">
      <span className="latest-message-tab" data-testid="latest-message-tab">
        {harnessLabel}
        {MARK[latest.status] && ` ${t(MARK[latest.status])}`}
      </span>{' '}
      <span className="muted">{time}</span>{' '}
      <span className="latest-message-line" data-testid="latest-message-line">
        <FileContent rel="line.md" content={stripUnsafe(firstLine(latest.text))} inline />
      </span>
      {latest.truncated && <span className="muted"> {t('latestMessage.shortened')}</span>}{' '}
      {latest.status === 'waiting' ? (
        <button type="button" className="btn btn-accent" onClick={() => onOpenReply?.(latest.eventId)} data-testid="latest-message-answer">
          {t('latestMessage.answer')}
        </button>
      ) : (
        <button type="button" className="btn" onClick={() => setViewing(true)} data-testid="latest-message-show">
          {t('latestMessage.show')}
        </button>
      )}
      <dialog
        ref={viewRef}
        className="settings-dialog question-popup"
        aria-label={t('latestMessage.view', { harness: harnessLabel })}
        onCancel={(e) => {
          e.preventDefault();
          setViewing(false);
        }}
        data-testid="latest-message-view"
      >
        {viewing && (
          <div>
            <ReplyMessage message={{ text: latest.text, truncated: latest.truncated, empty: latest.empty }} harnessLabel={harnessLabel} />
            <div className="question-popup-actions">
              <button type="button" className="btn" onClick={() => setViewing(false)} data-testid="latest-message-view-close">
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
