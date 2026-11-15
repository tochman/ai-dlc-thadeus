// US-0506 u3 US3.1, BR6.9–BR6.14, BR6.17, PD13, SD11: the reply (MESSAGE) page of AgentDialog, and the message body
// it shares with the latest-message strip's Show view. The agent's text is rendered through FileContent (raw HTML
// skipped, links only for http and https) after cleanBody, so bidi and zero-width characters cannot reorder it (K7).
// The answer is one line of text; main cleans it again and types it with Enter (BR6.11, BR6.12).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cleanBody, cleanLine, utf8Bytes } from '../shared/agentText.js';
import { FileContent } from './ArtifactReader.jsx';

const MAX_LINE_BYTES = 65_536;
const agentBridge = () => window.bridge?.agentEvents;
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/** The message body: Markdown, or the empty line; plus the 64 KB line when it was cut (BR6.9, AC3.1.5). */
export function ReplyMessage({ message, harnessLabel }) {
  const { t } = useTranslation();
  return (
    <>
      {message.empty ? (
        <p className="question-popup-status">{t('agentDialog.reply.empty', { harness: harnessLabel })}</p>
      ) : (
        <FileContent rel="reply.md" content={cleanBody(message.text)} />
      )}
      {message.truncated && <p className="question-popup-status">{t('agentDialog.reply.truncated')}</p>}
    </>
  );
}

/** True when the field holds a sendable line: not empty after cleaning, at most 64 KB (K9). */
export function sendable(text) {
  const line = cleanLine(text);
  return line.trim() !== '' && utf8Bytes(line) <= MAX_LINE_BYTES;
}

export default function ReplyPage({ ev, harnessLabel, keysRef, guarded }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [localError, setLocalError] = useState(null);
  keysRef.current = null; // a question page's digit keys must never act on a reply
  const open = ev.state === 'shown';
  const canSend = open && sendable(text);

  function send() {
    if (guarded() || !canSend) return; // review fix 1: nothing typed for something else answers
    const bridge = agentBridge();
    bridge?.stamp?.(ev.eventId, 'answerClicked'); // before the call (OD5)
    setLocalError(null);
    bridge?.answer(ev.eventId, { reply: { text } }).catch((err) => setLocalError(errorText(err)));
  }
  function copy() {
    navigator.clipboard?.writeText(text).catch((err) => console.warn('Texten kunde inte kopieras:', errorText(err)));
  }

  const error = ev.lastError ?? localError;
  let status = null;
  if (ev.state === 'ended' && ev.via === 'typed') status = { text: t('agentDialog.reply.sent', { harness: harnessLabel }) };
  else if (ev.state === 'sending') status = { text: t('agentDialog.state.sending') };
  else if (error && ev.state !== 'stale') status = { text: t('agentDialog.state.failed', { error }), error: true };

  return (
    <div data-testid="agent-dialog-reply">
      <ReplyMessage message={ev.message} harnessLabel={harnessLabel} />
      <form
        className="question-popup-own"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('agentDialog.reply.answer')}
          aria-label={t('agentDialog.reply.answer')}
          disabled={!open}
          data-autofocus
          data-testid="agent-dialog-reply-text"
        />
        <button type="submit" className="btn btn-accent" disabled={!canSend} data-testid="agent-dialog-reply-send">
          {t('agentDialog.send')}
        </button>
      </form>
      {ev.state === 'stale' && (
        <div className="question-popup-own">
          <p className="question-popup-status" role="status" data-testid="agent-dialog-reply-stale">
            {t(`agentDialog.reply.stale.${ev.staleReason ?? 'movedOn'}`, { harness: harnessLabel })}
          </p>
          <button type="button" className="btn" onClick={copy} data-testid="agent-dialog-reply-copy">
            {t('agentDialog.reply.copy')}
          </button>
        </div>
      )}
      {status && (
        <p className={`question-popup-status${status.error ? ' is-error' : ''}`} role="status" data-testid="agent-dialog-reply-status">
          {status.text}
        </p>
      )}
    </div>
  );
}
