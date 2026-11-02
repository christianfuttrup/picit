import { openDb } from '../src/db/connection.ts';
import { migrate } from '../src/db/migrate.ts';

const db = openDb(process.env['DB_PATH'] ?? 'data/shipments.db');
const applied = migrate(db, 'migrations');
console.log(applied.length > 0 ? `Applied: ${applied.join(', ')}` : 'Nothing to apply');
db.close();
