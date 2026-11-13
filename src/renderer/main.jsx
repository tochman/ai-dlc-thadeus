import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import '@fontsource/antonio/400.css';
import '@fontsource/antonio/600.css';
import '@fontsource/antonio/700.css';
import './theme.css';
import App from './App.jsx';
import i18n from '../shared/i18n.js';

// The language main resolved from the settings (auto follows the OS), set before the first render so the
// app never flashes in another language (EPIC-07 US-0701 FR4.2). On failure the bundled default (Swedish) stays.
// <html lang> follows, so screen readers and CSS hyphenation use the right language (FR8.1).
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});
window.bridge
  .getLanguage()
  .then((lng) => i18n.changeLanguage(lng))
  .catch((err) => console.error('Språket kunde inte läsas:', err))
  .finally(() =>
    createRoot(document.getElementById('root')).render(
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    )
  );
