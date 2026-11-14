import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../shared/i18n.js';

const bridge = window.bridge;
const HIGHLIGHT_MS = 4000;

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/**
 * Loads the intent list and the selected intent for one project tab and reloads only
 * what a `project:changed` event names (FR7.2). New audit events get a short highlight (FR7.3).
 */
export function useProject(projectId, initialSpace) {
  const [space, setSpace] = useState(initialSpace);
  const [intents, setIntents] = useState([]);
  const [listWarning, setListWarning] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [newKeys, setNewKeys] = useState(null); // Set of audit event keys added by the last live updates (FR2.2)
  const highlightTimer = useRef(null);
  const [error, setError] = useState(null);
  const [cost, setCost] = useState(null); // null while loading, then {available, ...}
  const [models, setModels] = useState(null);
  // When AI-DLC last wrote under intents/ (active-directive.json included); "AI-DLC arbetar" in RefreshPanel (FR3.5).
  const [lastIntentChangeAt, setLastIntentChangeAt] = useState(null);
  const selectedRef = useRef(selected);
  const detailRef = useRef(detail);
  selectedRef.current = selected;
  detailRef.current = detail;

  const loadList = useCallback(
    async (onlyDirs) => {
      try {
        const res = await bridge.getIntents(projectId, space, onlyDirs);
        setIntents(res.intents);
        setListWarning(res.warning);
        setError(null);
        setSelected((cur) => cur ?? res.intents.find((i) => i.active)?.dirName ?? res.intents[0]?.dirName ?? null);
      } catch (err) {
        setError(t('intents.loadFailed', { error: errorText(err) }));
      }
    },
    [projectId, space]
  );

  const clearHighlight = useCallback(() => {
    clearTimeout(highlightTimer.current);
    highlightTimer.current = null;
    setNewKeys(null);
  }, []);

  // A new update extends the highlight and keeps keys that are still marked (FR2.5).
  const highlight = useCallback((keys) => {
    clearTimeout(highlightTimer.current);
    setNewKeys((cur) => new Set([...(cur ?? []), ...keys]));
    highlightTimer.current = setTimeout(() => {
      highlightTimer.current = null;
      setNewKeys(null);
    }, HIGHLIGHT_MS);
  }, []);

  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  const loadDetail = useCallback(
    async (dirName, { live = false } = {}) => {
      if (!dirName) return setDetail(null);
      try {
        const next = await bridge.getIntent(projectId, space, dirName);
        if (selectedRef.current !== dirName) return; // selection moved on while loading
        const prev = detailRef.current;
        if (live && prev?.dirName === dirName) {
          const before = new Set(prev.events.map((e) => e.key));
          const added = next.events.filter((e) => !before.has(e.key)).map((e) => e.key);
          if (added.length > 0) highlight(added);
        }
        setDetail(next);
        setError(null);
      } catch (err) {
        setError(t('intents.detailFailed', { name: dirName, error: errorText(err) }));
      }
    },
    [projectId, space, highlight]
  );

  // A cost failure only affects the cost views (NFR3), so it never sets the shared error banner.
  const loadCost = useCallback(async () => {
    try {
      setCost(await bridge.getCost(projectId, space));
    } catch (err) {
      setCost({ available: false, reason: t('cost.loadFailed', { error: errorText(err) }) });
    }
  }, [projectId, space]);

  useEffect(() => {
    setSelected(null);
    setDetail(null);
    loadList();
    loadCost();
  }, [loadList, loadCost]);

  useEffect(() => {
    let cancelled = false;
    bridge
      .getModels(projectId)
      .then((m) => !cancelled && setModels(m))
      .catch((err) => !cancelled && setModels({ source: 'none', agents: [], error: errorText(err) }));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    clearHighlight();
    loadDetail(selected);
  }, [selected, loadDetail, clearHighlight]);

  useEffect(() => {
    const offChange = bridge.onProjectChanged((c) => {
      if (c.projectId !== projectId || c.space !== space) return;
      if (c.dirNames.length > 0) setLastIntentChangeAt(Date.now());
      loadList(c.indexChanged ? undefined : c.dirNames);
      if (c.costChanged || c.indexChanged) loadCost(); // a new intent can claim an existing ledger entry
      if (c.indexChanged || c.dirNames.includes(selectedRef.current)) {
        loadDetail(selectedRef.current, { live: true });
      }
    });
    const offError = bridge.onWatchError((e) => {
      if (e.projectId === projectId) setError(t('intents.watchStopped', { message: String(e.message ?? '') }));
    });
    return () => {
      offChange();
      offError();
    };
  }, [projectId, space, loadList, loadDetail, loadCost]);

  return { space, setSpace, intents, listWarning, selected, setSelected, detail, newKeys, error, cost, models, lastIntentChangeAt };
}
