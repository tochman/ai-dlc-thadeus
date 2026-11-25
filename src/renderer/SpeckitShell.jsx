// US-1401 FR1.4: a Spec Kit project's first view, in the LCARS frame (BR1.6, BR1.12). US-1402 FR6 fills it with
// the features under specs/ and the Spec Kit version note. US-1410 BR10.5: the agent progress readout above them.
// US-0048 L1: the features report their count to the left arm through `onMeta`.
import { useTranslation } from 'react-i18next';
import { Frame } from './Lcars.jsx';
import SpeckitFeatures from './SpeckitFeatures.jsx';
import SpeckitProgress from './SpeckitProgress.jsx';

/** @param {{projectId: string, onMeta?: (projectId: string, partial: object) => void}} props */
export default function SpeckitShell({ projectId, onMeta }) {
  const { t } = useTranslation();
  return (
    <section className="content" aria-labelledby="speckit-shell-title" data-testid="speckit-shell-root">
      <Frame>
        <div className="lcars-heading">
          <h2 id="speckit-shell-title" className="section-title">
            {t('speckit.title')}
          </h2>
          <span className="lcars-heading-line" aria-hidden="true" />
        </div>
        <SpeckitProgress projectId={projectId} />
        <SpeckitFeatures projectId={projectId} onMeta={onMeta} />
      </Frame>
    </section>
  );
}
