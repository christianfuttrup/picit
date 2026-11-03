import type { Db } from './connection.ts';

const TERMINALS = [
    ['DKAAR', 'Aarhus'],
    ['DKCPH', 'Copenhagen'],
    ['DEHAM', 'Hamburg'],
    ['NLRTM', 'Rotterdam'],
] as const;

const SHIPMENTS = [
    ['11111111-1111-4111-8111-111111111111', 'SHP-0001', 'DKAAR', 'DEHAM', 'BOOKED'],
    ['22222222-2222-4222-8222-222222222222', 'SHP-0002', 'DKCPH', 'NLRTM', 'LOADED'],
    ['33333333-3333-4333-8333-333333333333', 'SHP-0003', 'DEHAM', 'DKAAR', 'IN_TRANSIT'],
    ['44444444-4444-4444-8444-444444444444', 'SHP-0004', 'NLRTM', 'DKCPH', 'DELIVERED'],
] as const;

/** Inserts reference terminals and one shipment per status. Safe to run twice. */
export function seed(db: Db): void {
    const insertTerminal = db.prepare('INSERT OR IGNORE INTO terminals (code, name) VALUES (?, ?)');
    const insertShipment = db.prepare(
        `INSERT OR IGNORE INTO shipments (id, reference, origin, destination, status, created_at)
     VALUES (?, ?, ?, ?, ?, '2026-10-01T08:00:00.000Z')`,
    );
    db.transaction(() => {
        for (const t of TERMINALS) insertTerminal.run(...t);
        for (const s of SHIPMENTS) insertShipment.run(...s);
    })();
}
