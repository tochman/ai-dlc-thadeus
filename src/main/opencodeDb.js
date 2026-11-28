// US-0058 FR1, NFR1: opencode's assistant messages for one project, read from its own database (read only). opencode 2
// runs plugins in a shared server process, so this is the one place that sees every opencode session.
import os from 'node:os';
import path from 'node:path';

export const OPENCODE_DB = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');

const SQL = `SELECT json_extract(m.data, '$.time.completed') AS at, json_extract(m.data, '$.agent') AS agent,
  json_extract(m.data, '$.model.id') AS model, json_extract(m.data, '$.cost') AS cost, json_extract(m.data, '$.tokens') AS tokens
  FROM session_message m JOIN session_v2 s ON s.id = m.session_id
  WHERE m.type = 'assistant' AND (s.directory = ? OR s.directory LIKE ? ESCAPE '\\') AND at IS NOT NULL ORDER BY at`;

/**
 * Messages of sessions started in `root` or a folder under it, oldest first. A missing database, a changed schema or
 * any other error gives [] and a warning; the views never break on it. ponytail: the whole list is read on every load;
 * keep the last `at` and read only newer rows if it shows.
 * @returns {Promise<{at: number, agent: string, model: string, cost: number, tokens: object}[]>}
 */
export async function readOpencodeMessages(root, file = OPENCODE_DB) {
  let db;
  try {
    const { DatabaseSync } = await import('node:sqlite');
    db = new DatabaseSync(file, { readOnly: true });
    const under = `${root.replace(/[\\%_]/g, '\\$&')}/%`;
    return db
      .prepare(SQL)
      .all(root, under)
      .map((r) => ({ at: r.at, agent: r.agent ?? 'main', model: r.model ?? 'unknown', cost: Number(r.cost) || 0, tokens: JSON.parse(r.tokens ?? '{}') }));
  } catch (err) {
    if (!/unable to open/i.test(err.message)) console.warn('Kunde inte läsa opencodes databas:', err.message);
    return [];
  } finally {
    db?.close();
  }
}
