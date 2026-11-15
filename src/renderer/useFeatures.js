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
  // The story lifecycle rule in the space's memory (US-0603 FR5.2): null until read, or when it cannot be read.
  const [ruleStatus, setRuleStatus] = useState(null);
  const bridge = window.bridge;

  const loadRule = useCallback(async () => {
    if (!space) return setRuleStatus(null);
    try {
      setRuleStatus(await bridge.getLifecycleRuleStatus(projectId, space));
    } catch (err) {
      console.error('Livscykelregeln kunde inte läsas:', err); // no notice then; the rest of the view is unaffected
      setRuleStatus(null);
    }
  }, [projectId, space]);

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
    loadRule();
  }, [loadDocs, loadLinks, loadRule]);

  // A setting change sends features:changed, so the rule is checked again for the new setting (US-0603 FR5.3);
  // a project change may be the agent saving the rule.
  useEffect(() => {
    const offFeatures = bridge.onFeaturesChanged?.((c) => {
      if (c.projectId !== projectId) return;
      loadDocs();
      loadRule();
    });
    const offProject = bridge.onProjectChanged?.((c) => {
      if (c.projectId !== projectId) return;
      if (c.indexChanged) loadLinks();
      loadRule();
    });
    return () => {
      offFeatures?.();
      offProject?.();
    };
  }, [projectId, loadDocs, loadLinks, loadRule]);

  // settingsLoaded: the agent tab waits for the saved harness choice before it starts anything (US-0801).
  return { features, settings: settings ?? DEFAULT_SETTINGS, settingsLoaded: settings !== null, links, ruleStatus };
}
