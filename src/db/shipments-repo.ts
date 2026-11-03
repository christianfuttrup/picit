import type { Shipment } from '../domain/shipment.ts';
import type { Db } from './connection.ts';

export interface ShipmentRow {
    id: string;
    reference: string;
    origin: string;
    destination: string;
    status: string;
    revision: number;
    created_at: string;
}

/** Maps a database row to the Shipment union. The CHECK constraint makes the default branch unreachable. */
export function rowToShipment(row: ShipmentRow): Shipment {
    const base = {
        id: row.id,
        reference: row.reference,
        origin: row.origin,
        destination: row.destination,
        revision: row.revision,
        createdAt: row.created_at,
    };
    switch (row.status) {
        case 'BOOKED':
        case 'LOADED':
        case 'IN_TRANSIT':
        case 'DELIVERED':
            return { ...base, status: row.status };
        default:
            throw new Error(`Unknown shipment status in database: ${row.status}`);
    }
}

export function findById(db: Db, id: string): Shipment | undefined {
    const row = db
        .prepare<[string], ShipmentRow>(
            'SELECT id, reference, origin, destination, status, revision, created_at FROM shipments WHERE id = ?',
        )
        .get(id);
    return row ? rowToShipment(row) : undefined;
}

/** Sets the destination and bumps the revision. Returns false when `expectedRevision` is stale. */
export function updateDestination(
    db: Db,
    id: string,
    destination: string,
    expectedRevision: number,
): boolean {
    const { changes } = db
        .prepare<[string, string, number]>(
            'UPDATE shipments SET destination = ?, revision = revision + 1 WHERE id = ? AND revision = ?',
        )
        .run(destination, id, expectedRevision);
    return changes === 1;
}
