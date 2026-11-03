import { buildApp } from './app.ts';
import { openDb } from './db/connection.ts';

const db = openDb(process.env['DB_PATH'] ?? 'data/shipments.db');
const port = Number(process.env['PORT'] ?? 3000);

buildApp(db).listen(port, () => {
    console.log(`shipment-service listening on http://localhost:${port}`);
});
