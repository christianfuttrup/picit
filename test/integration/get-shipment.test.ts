import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.ts';
import type { Db } from '../../src/db/connection.ts';
import { SEEDED, createTestDb } from './helpers.ts';

let db: Db;
beforeEach(() => {
    db = createTestDb();
});

describe('GET /shipments/:id', () => {
    it('returns a seeded shipment', async () => {
        const res = await request(buildApp(db)).get(`/shipments/${SEEDED.booked}`);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            id: SEEDED.booked,
            reference: 'SHP-0001',
            origin: 'DKAAR',
            destination: 'DEHAM',
            status: 'BOOKED',
        });
    });

    it('returns 404 for an unknown shipment', async () => {
        const res = await request(buildApp(db)).get(
            '/shipments/99999999-9999-4999-8999-999999999999',
        );

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('NOT_FOUND');
    });

    it('returns 400 for a malformed id', async () => {
        const res = await request(buildApp(db)).get('/shipments/not-a-uuid');

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
    });
});

describe('database constraints', () => {
    it('rejects a shipment with an unknown status', () => {
        expect(() =>
            db
                .prepare(
                    `INSERT INTO shipments (id, reference, origin, destination, status, created_at)
           VALUES ('x', 'SHP-9', 'DKAAR', 'DEHAM', 'LOST', '2026-10-01T00:00:00.000Z')`,
                )
                .run(),
        ).toThrow(/CHECK constraint failed/);
    });

    it('rejects a shipment pointing at an unknown terminal', () => {
        expect(() =>
            db
                .prepare(
                    `INSERT INTO shipments (id, reference, origin, destination, status, created_at)
           VALUES ('y', 'SHP-8', 'DKAAR', 'XXXXX', 'BOOKED', '2026-10-01T00:00:00.000Z')`,
                )
                .run(),
        ).toThrow(/FOREIGN KEY constraint failed/);
    });
});
