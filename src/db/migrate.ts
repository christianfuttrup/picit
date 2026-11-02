import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from './connection.ts';

const MIGRATION_FILE = /^\d{3}_.+\.sql$/;

/** Applies pending `NNN_*.sql` files in order, each in its own transaction. Returns applied names. */
export function migrate(db: Db, dir: string): string[] {
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name TEXT PRIMARY KEY,
       applied_at TEXT NOT NULL
     )`,
  );
  const applied = new Set(
    db
      .prepare<[], { name: string }>('SELECT name FROM schema_migrations')
      .all()
      .map((r) => r.name),
  );
  const pending = readdirSync(dir)
    .filter((f) => MIGRATION_FILE.test(f) && !applied.has(f))
    .sort();

  const record = db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)');
  for (const name of pending) {
    const sql = readFileSync(join(dir, name), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      record.run(name, new Date().toISOString());
    })();
  }
  return pending;
}
