import { openDb } from '../src/db/connection.ts';
import { seed } from '../src/db/seed.ts';

const db = openDb(process.env['DB_PATH'] ?? 'data/shipments.db');
seed(db);
console.log('Seeded terminals and shipments');
db.close();
