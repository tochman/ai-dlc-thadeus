// Monaco for the editor (EPIC-10 US-1001), loaded only through the dynamic import in MonacoPane.jsx, so none of
// it is in the app's start bundle. The npm package is bundled by electron-vite and handed to @monaco-editor/react
// with loader.config({ monaco }), so the loader never reaches for its CDN default (the CSP and main block it anyway).
// Only the editor API, the features the story names and the languages below are included, to keep the bundle small.
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/editor/editor.api';
// Features: find and replace, multiple cursors, the diff editor (conflicts), and the everyday editing ones.
import 'monaco-editor/features/find/register';
import 'monaco-editor/features/multicursor/register';
import 'monaco-editor/features/diffEditor/register';
import 'monaco-editor/features/clipboard/register';
import 'monaco-editor/features/contextmenu/register';
import 'monaco-editor/features/comment/register';
import 'monaco-editor/features/folding/register';
import 'monaco-editor/features/linesOperations/register';
import 'monaco-editor/features/bracketMatching/register';
import 'monaco-editor/features/hover/register';
import 'monaco-editor/features/suggest/register';
// Languages: syntax colouring, and the four with a language service (JSON, CSS, HTML, TS/JS) and their workers.
import 'monaco-editor/languages/definitions/markdown/register';
import 'monaco-editor/languages/definitions/javascript/register';
import 'monaco-editor/languages/definitions/typescript/register';
import 'monaco-editor/languages/definitions/yaml/register';
import 'monaco-editor/languages/definitions/css/register';
import 'monaco-editor/languages/definitions/scss/register';
import 'monaco-editor/languages/definitions/less/register';
import 'monaco-editor/languages/definitions/html/register';
import 'monaco-editor/languages/definitions/shell/register';
import 'monaco-editor/languages/definitions/python/register';
import 'monaco-editor/languages/definitions/xml/register';
import 'monaco-editor/languages/definitions/ini/register';
import 'monaco-editor/languages/definitions/sql/register';
import 'monaco-editor/languages/definitions/dockerfile/register';
import 'monaco-editor/languages/features/json/register';
import 'monaco-editor/languages/features/css/register';
import 'monaco-editor/languages/features/html/register';
import 'monaco-editor/languages/features/typescript/register';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/language/json/json.worker?worker';
import CssWorker from 'monaco-editor/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker';

/** The worker for a Monaco label, as the monaco-react README lists them. */
export function workerFor(label) {
  if (label === 'json') return new JsonWorker();
  if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
  if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
  if (label === 'typescript' || label === 'javascript') return new TsWorker();
  return new EditorWorker();
}

// Before loader.init(): Monaco asks this for every worker it starts.
self.MonacoEnvironment = { getWorker: (_workerId, label) => workerFor(label) };
loader.config({ monaco });

// The LCARS palette from theme.css (Monaco needs literal colours, not CSS variables).
monaco.editor.defineTheme('lcars', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '9aa3b8', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'ff9e40' },
    { token: 'string', foreground: 'a9d6f2' },
    { token: 'number', foreground: 'f2a389' },
    { token: 'type', foreground: '7cc0ea' },
    { token: 'tag', foreground: '4fa3d9' },
    { token: 'attribute.name', foreground: 'ff9e40' },
    { token: 'keyword.md', foreground: 'ff9e40', fontStyle: 'bold' }
  ],
  colors: {
    'editor.background': '#05060a',
    'editor.foreground': '#e6e9f2',
    'editorLineNumber.foreground': '#4a5370',
    'editorLineNumber.activeForeground': '#ff9e40',
    'editorCursor.foreground': '#ff9e40',
    'editor.selectionBackground': '#1f3b57',
    'editor.lineHighlightBackground': '#11151f',
    'editorIndentGuide.background1': '#1a1f2d',
    'editorWidget.background': '#11151f',
    'editorWidget.border': '#4fa3d9',
    'editor.findMatchBackground': '#ff9e4066',
    'editor.findMatchHighlightBackground': '#4fa3d944',
    'diffEditor.insertedTextBackground': '#4fa3d933',
    'diffEditor.removedTextBackground': '#ee6c5633'
  }
});

export default monaco;
