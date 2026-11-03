import { openDb } from '../../src/db/connection.ts';
import type { Db } from '../../src/db/connection.ts';
import { migrate } from '../../src/db/migrate.ts';
import { seed } from '../../src/db/seed.ts';

export const SEEDED = {
    booked: '11111111-1111-4111-8111-111111111111',
    loaded: '22222222-2222-4222-8222-222222222222',
    inTransit: '33333333-3333-4333-8333-333333333333',
    delivered: '44444444-4444-4444-8444-444444444444',
};

export function createTestDb(): Db {
    const db = openDb(':memory:');
    migrate(db, 'migrations');
    seed(db);
    return db;
}
