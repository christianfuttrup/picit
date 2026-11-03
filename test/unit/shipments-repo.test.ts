import { describe, expect, it } from 'vitest';
import { rowToShipment } from '../../src/db/shipments-repo.ts';

const row = {
    id: '11111111-1111-4111-8111-111111111111',
    reference: 'SHP-0001',
    origin: 'DKAAR',
    destination: 'DEHAM',
    status: 'BOOKED',
    created_at: '2026-10-01T08:00:00.000Z',
};

describe('rowToShipment', () => {
    it('maps snake_case columns to the domain shape', () => {
        expect(rowToShipment(row)).toEqual({
            id: row.id,
            reference: 'SHP-0001',
            origin: 'DKAAR',
            destination: 'DEHAM',
            status: 'BOOKED',
            createdAt: '2026-10-01T08:00:00.000Z',
        });
    });

    it.each(['BOOKED', 'LOADED', 'IN_TRANSIT', 'DELIVERED'])('keeps status %s', (status) => {
        expect(rowToShipment({ ...row, status }).status).toBe(status);
    });

    it('throws on a status the database should never contain', () => {
        expect(() => rowToShipment({ ...row, status: 'LOST' })).toThrow(/Unknown shipment status/);
    });
});
