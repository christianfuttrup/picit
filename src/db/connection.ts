import Database from 'better-sqlite3';

export type Db = Database.Database;

/** Opens a database at `path` (a file for dev, `:memory:` for tests). */
export function openDb(path: string): Db {
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  if (path !== ':memory:') db.pragma('journal_mode = WAL');
  return db;
}
