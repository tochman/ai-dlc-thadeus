// The Monaco editor itself (EPIC-10 US-1001). EditorPanel loads this file with React.lazy, so Monaco and its setup
// arrive the first time an editor opens. monacoSetup.js runs first: it hands the bundled Monaco to the loader.
import './monacoSetup.js';
import Editor, { DiffEditor } from '@monaco-editor/react';

/**
 * One file, or with `original` the diff editor (disk version left, the person's right).
 * @param {{path: string, language: string, value: string, original?: string, readOnly: boolean, onChange?: (text: string) => void}} props
 */
export default function MonacoPane({ path, language, value, original, readOnly, onChange }) {
  const options = { readOnly, minimap: { enabled: false }, fontSize: 13, automaticLayout: true, wordWrap: language === 'markdown' ? 'on' : 'off' };
  if (original !== undefined) {
    return <DiffEditor theme="lcars" language={language} original={original} modified={value} options={{ ...options, readOnly: true }} />;
  }
  return <Editor theme="lcars" path={path} language={language} value={value} onChange={(text) => onChange?.(text ?? '')} options={options} />;
}
