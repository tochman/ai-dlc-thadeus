import { useCallback, useEffect, useState } from 'react';
import { t } from '../shared/i18n.js';

const DEFAULT_SETTINGS = { featureDocs: 'auto', featuresPath: 'docs/FEATURES.md' };
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/**
 * Feature docs, story links and project settings for one project tab (EPIC-06). Reloads on `features:changed`,
 * which the main process sends when the files or the project settings change (FR2.7), and reloads the story
 * links when the intent index changes.
 * @param {string|null} space AI-DLC space for the story links; null in a project without AI-DLC
 */
export function useFeatures(projectId, space) {
  const [features, setFeatures] = useState(null); // null while loading
  const [settings, setSettings] = useState(null); // null until the saved project settings are read
  const [links, setLinks] = useState({});
  const bridge = window.bridge;

  const loadDocs = useCallback(async () => {
    try {
      const [s, f] = await Promise.all([bridge.getProjectSettings(projectId), bridge.loadFeatures(projectId)]);
      setSettings(s);
      setFeatures(f);
    } catch (err) {
      setSettings((s) => s ?? DEFAULT_SETTINGS); // the agent tab still starts, on the default harness
      setFeatures({ available: false, reason: t('features.loadFailed', { error: errorText(err) }) });
    }
  }, [projectId]);

  const loadLinks = useCallback(async () => {
    if (!space) return setLinks({});
    try {
      setLinks(await bridge.getStoryLinks(projectId, space));
    } catch (err) {
      console.error('Story-länkar kunde inte läsas:', err); // the stories still show, only without links
    }
  }, [projectId, space]);

  useEffect(() => {
    loadDocs();
    loadLinks();
  }, [loadDocs, loadLinks]);

  useEffect(() => {
    const offFeatures = bridge.onFeaturesChanged?.((c) => c.projectId === projectId && loadDocs());
    const offProject = bridge.onProjectChanged?.((c) => c.projectId === projectId && c.indexChanged && loadLinks());
    return () => {
      offFeatures?.();
      offProject?.();
    };
  }, [projectId, loadDocs, loadLinks]);

  // settingsLoaded: the agent tab waits for the saved harness choice before it starts anything (US-0801).
  return { features, settings: settings ?? DEFAULT_SETTINGS, settingsLoaded: settings !== null, links };
}
