import type { Shipment } from '../domain/shipment.ts';
import type { Db } from './connection.ts';

export interface ShipmentRow {
  id: string;
  reference: string;
  origin: string;
  destination: string;
  status: string;
  created_at: string;
}

/** Maps a database row to the Shipment union. The CHECK constraint makes the default branch unreachable. */
export function rowToShipment(row: ShipmentRow): Shipment {
  const base = {
    id: row.id,
    reference: row.reference,
    origin: row.origin,
    destination: row.destination,
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
      'SELECT id, reference, origin, destination, status, created_at FROM shipments WHERE id = ?',
    )
    .get(id);
  return row ? rowToShipment(row) : undefined;
}
