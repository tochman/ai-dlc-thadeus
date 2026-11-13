// Renderer tests run in Swedish, as the app did before US-0701, so assertions on Swedish text keep passing.
// Tests that check English switch with i18n.changeLanguage('en') and switch back afterwards.
import { setI18n } from 'react-i18next';
import i18n from '../../src/shared/i18n.js';

setI18n(i18n);
await i18n.changeLanguage('sv');
