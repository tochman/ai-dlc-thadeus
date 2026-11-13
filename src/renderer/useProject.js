import { useCallback, useEffect, useRef, useState } from 'react';

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
  const [newSeqFrom, setNewSeqFrom] = useState(null);
  const [error, setError] = useState(null);
  const [cost, setCost] = useState(null); // null while loading, then {available, ...}
  const [models, setModels] = useState(null);
  // When AI-DLC last wrote under intents/ (active-directive.json included); "AI-DLC arbetar" in RefreshPanel (FR3.5).
  const [lastIntentChangeAt, setLastIntentChangeAt] = useState(null);
  const selectedRef = useRef(selected);
  const detailRef = useRef(detail);
  selectedRef.current = selected;
  detailRef.current = detail;

  const loadList = useCallback(async (onlyDirs) => {
    try {
      const res = await bridge.getIntents(projectId, space, onlyDirs);
      setIntents(res.intents);
      setListWarning(res.warning);
      setError(null);
      setSelected((cur) => cur ?? res.intents.find((i) => i.active)?.dirName ?? res.intents[0]?.dirName ?? null);
    } catch (err) {
      setError(`Kunde inte läsa intents: ${errorText(err)}`);
    }
  }, [projectId, space]);

  const loadDetail = useCallback(
    async (dirName, { live = false } = {}) => {
      if (!dirName) return setDetail(null);
      try {
        const next = await bridge.getIntent(projectId, space, dirName);
        if (selectedRef.current !== dirName) return; // selection moved on while loading
        const prev = detailRef.current;
        if (live && prev?.dirName === dirName && next.events.length > prev.events.length) {
          setNewSeqFrom(prev.events.length);
          setTimeout(() => setNewSeqFrom(null), HIGHLIGHT_MS);
        }
        setDetail(next);
        setError(null);
      } catch (err) {
        setError(`Kunde inte läsa ${dirName}: ${errorText(err)}`);
      }
    },
    [projectId, space]
  );

  // A cost failure only affects the cost views (NFR3), so it never sets the shared error banner.
  const loadCost = useCallback(async () => {
    try {
      setCost(await bridge.getCost(projectId, space));
    } catch (err) {
      setCost({ available: false, reason: `Kostnaden kunde inte läsas: ${errorText(err)}` });
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
    setNewSeqFrom(null);
    loadDetail(selected);
  }, [selected, loadDetail]);

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
      if (e.projectId === projectId) setError(`Filbevakningen stannade: ${e.message}`);
    });
    return () => {
      offChange();
      offError();
    };
  }, [projectId, space, loadList, loadDetail, loadCost]);

  return { space, setSpace, intents, listWarning, selected, setSelected, detail, newSeqFrom, error, cost, models, lastIntentChangeAt };
}
