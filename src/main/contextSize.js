// US-0213 FR1.1, FR1.2: the context size of an agent's last request (input + cache read + cache write) and its model.
// Claude Code: from the session transcript the Stop hook names (one bounded tail read, confined to a folder).
// opencode: from the assistant message's token usage the plugin reports. Unknown is null, never 0.
import { promises as fs } from 'node:fs';
import path from 'node:path';

const TAIL_BYTES = 256 * 1024; // ponytail: the last usage line must sit in the last 256 KB; widen if a turn writes more
const count = (n) => (Number.isFinite(n) && n >= 0 ? n : 0);

/** US-0213 FR1.1: the last assistant line with usage in JSONL text, or null. A broken line (half written) is skipped. */
export function contextOfTranscript(text) {
  const lines = String(text).split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    let row;
    try {
      row = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    const usage = row?.type === 'assistant' ? row.message?.usage : null;
    if (!usage || typeof usage !== 'object') continue;
    const tokens = count(usage.input_tokens) + count(usage.cache_read_input_tokens) + count(usage.cache_creation_input_tokens);
    return { tokens, model: typeof row.message.model === 'string' ? row.message.model : null };
  }
  return null;
}

/** US-0213 FR1.1, US-0215 FR2.1: the absolute `file` when it lies inside `allowedDir`, else null. */
export function insideDir(file, allowedDir) {
  if (typeof file !== 'string' || !path.isAbsolute(file) || typeof allowedDir !== 'string') return null;
  const abs = path.resolve(file);
  return abs.startsWith(path.resolve(allowedDir) + path.sep) ? abs : null;
}

/** US-0213 FR1.1: reads the transcript's tail, only inside `allowedDir`; null when absent, outside or unreadable. */
export async function readTranscriptContext(file, allowedDir) {
  const abs = insideDir(file, allowedDir);
  if (!abs) return null;
  let fh;
  try {
    fh = await fs.open(abs, 'r');
    const { size } = await fh.stat();
    const start = Math.max(0, size - TAIL_BYTES);
    const buf = Buffer.alloc(size - start);
    await fh.read(buf, 0, buf.length, start);
    return contextOfTranscript(buf.toString('utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('[handoff] transcript read failed:', err.code ?? err.message);
    return null;
  } finally {
    await fh?.close();
  }
}

/** US-0213 FR1.2: an opencode assistant message's `info` ({ modelID, tokens: { input, cache: { read, write } } }). */
export function opencodeContext(info) {
  const tk = info?.tokens;
  if (!tk || typeof tk !== 'object') return null;
  const tokens = count(tk.input) + count(tk.cache?.read) + count(tk.cache?.write);
  return { tokens, model: typeof info.modelID === 'string' ? info.modelID : null };
}
