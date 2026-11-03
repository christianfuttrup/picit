import type { Db } from './connection.ts';

export function terminalExists(db: Db, code: string): boolean {
    const row = db
        .prepare<[string], { one: number }>('SELECT 1 AS one FROM terminals WHERE code = ?')
        .get(code);
    return row !== undefined;
}
