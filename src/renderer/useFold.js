import { useCallback, useEffect, useState } from 'react';
import { t } from '../shared/i18n.js';

/**
 * US-0415 FR5.1–FR5.4 (ADR-005): the fold toggle shared by every list column. The folded state is kept per view
 * in the app settings (`listFolded`), so it survives a restart. A failed read leaves the list open; a failed save
 * keeps the state for this session. Both are logged.
 * @param {'intents'|'features'|'editor'} viewId
 * @returns {{folded: boolean, toggle: () => void, toggleProps: object}} toggleProps go on a `<button>`
 */
export function useFold(viewId) {
  const [folded, setFolded] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.resolve(window.bridge.getSettings?.()) // a bridge without settings (a test) leaves the list open
      .then((s) => live && setFolded(s?.listFolded?.[viewId] === true))
      .catch((err) => console.error('Listans läge kunde inte läsas:', err));
    return () => {
      live = false;
    };
  }, [viewId]);

  const toggle = useCallback(() => {
    const next = !folded;
    setFolded(next);
    // Read again before saving: listFolded is saved whole, and another view may have changed its own entry.
    const bridge = window.bridge;
    Promise.resolve(bridge.getSettings?.())
      .then((s) => bridge.setSettings?.({ listFolded: { ...s?.listFolded, [viewId]: next } }))
      .catch((err) => console.error('Listans läge kunde inte sparas:', err));
  }, [folded, viewId]);

  const toggleProps = {
    type: 'button',
    className: 'list-fold-toggle',
    'aria-expanded': !folded,
    'aria-label': t(folded ? 'fold.show' : 'fold.hide'),
    'data-testid': 'list-fold-toggle',
    onClick: (e) => {
      e.stopPropagation(); // the folded strip also toggles on a click; this click must not count twice
      toggle();
    }
  };
  return { folded, toggle, toggleProps };
}
