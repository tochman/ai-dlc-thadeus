// US-1401 FR1.4: a Spec Kit project's first view, in the LCARS frame (BR1.6, BR1.12). US-1402 FR6 fills it with
// the features under specs/ and the Spec Kit version note.
import { useTranslation } from 'react-i18next';
import { Frame } from './Lcars.jsx';
import SpeckitFeatures from './SpeckitFeatures.jsx';

/** @param {{projectId: string}} props */
export default function SpeckitShell({ projectId }) {
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
        <SpeckitFeatures projectId={projectId} />
      </Frame>
    </section>
  );
}
