import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/app.ts';
import type { Db } from '../../src/db/connection.ts';
import { SEEDED, createTestDb } from './helpers.ts';

const NOW = '2026-11-03T10:00:00.000Z';
const ACTOR = 'ops@terminal';
const UNKNOWN_ID = '99999999-9999-4999-8999-999999999999';

let db: Db;
beforeEach(() => {
    db = createTestDb();
});
afterEach(() => {
    vi.restoreAllMocks();
});

function patch(id: string, body: object, actor: string | null = ACTOR) {
    const req = request(buildApp(db, () => NOW)).patch(`/shipments/${id}/destination`);
    if (actor !== null) req.set('X-Actor', actor);
    return req.send(body);
}

function stored(id: string) {
    return db
        .prepare<[string], { destination: string; revision: number }>(
            'SELECT destination, revision FROM shipments WHERE id = ?',
        )
        .get(id);
}

function auditRows(id: string) {
    return db
        .prepare<[string], Record<string, unknown>>(
            'SELECT shipment_id, field, old_value, new_value, actor, changed_at FROM shipment_audit WHERE shipment_id = ?',
        )
        .all(id);
}

function expectUnchanged(id: string, destination: string) {
    expect(stored(id)).toEqual({ destination, revision: 1 });
    expect(auditRows(id)).toEqual([]);
}

describe('PATCH /shipments/:id/destination', () => {
    it('AC5: reroutes a booked shipment, bumps revision and writes an audit row', async () => {
        const res = await patch(SEEDED.booked, { destination: 'DKCPH', revision: 1 });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            id: SEEDED.booked,
            destination: 'DKCPH',
            status: 'BOOKED',
            revision: 2,
        });
        expect(stored(SEEDED.booked)).toEqual({ destination: 'DKCPH', revision: 2 });
        expect(auditRows(SEEDED.booked)).toEqual([
            {
                shipment_id: SEEDED.booked,
                field: 'destination',
                old_value: 'DEHAM',
                new_value: 'DKCPH',
                actor: ACTOR,
                changed_at: NOW,
            },
        ]);
    });

    it('AC5: a second reroute with the new revision succeeds', async () => {
        await patch(SEEDED.booked, { destination: 'DKCPH', revision: 1 });
        const res = await patch(SEEDED.booked, { destination: 'NLRTM', revision: 2 });

        expect(res.status).toBe(200);
        expect(res.body.revision).toBe(3);
        expect(auditRows(SEEDED.booked)).toHaveLength(2);
    });

    it.each([
        ['LOADED', SEEDED.loaded, 'NLRTM'],
        ['IN_TRANSIT', SEEDED.inTransit, 'DKAAR'],
        ['DELIVERED', SEEDED.delivered, 'DKCPH'],
    ])('AC1: rejects a %s shipment with 422 and changes nothing', async (status, id, current) => {
        const res = await patch(id, { destination: 'DEHAM', revision: 1 });

        expect(res.status).toBe(422);
        expect(res.body.code).toBe('SHIPMENT_NOT_BOOKED');
        expect(res.body.message).toContain(status);
        expectUnchanged(id, current);
    });

    it.each([
        ['AC2', 'an unknown terminal', 'SEGOT', 'UNKNOWN_TERMINAL'],
        ['AC6', 'the current destination', 'DEHAM', 'DESTINATION_UNCHANGED'],
        ['AC7', 'the origin', 'DKAAR', 'DESTINATION_EQUALS_ORIGIN'],
    ])('%s: rejects %s with 422 and changes nothing', async (_ac, _label, destination, code) => {
        const res = await patch(SEEDED.booked, { destination, revision: 1 });

        expect(res.status).toBe(422);
        expect(res.body.code).toBe(code);
        expectUnchanged(SEEDED.booked, 'DEHAM');
    });

    it.each([
        [{ revision: 1 }],
        [{ destination: 'dkcph', revision: 1 }],
        [{ destination: 123, revision: 1 }],
    ])('AC2: rejects a missing or malformed destination %j with 400', async (body) => {
        const res = await patch(SEEDED.booked, body);

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_DESTINATION');
        expectUnchanged(SEEDED.booked, 'DEHAM');
    });

    it('AC3: rejects a stale revision with 409 and changes nothing', async () => {
        const res = await patch(SEEDED.booked, { destination: 'DKCPH', revision: 2 });

        expect(res.status).toBe(409);
        expect(res.body.code).toBe('REVISION_CONFLICT');
        expectUnchanged(SEEDED.booked, 'DEHAM');
    });

    it('AC3: a second write with the same revision gets 409', async () => {
        await patch(SEEDED.booked, { destination: 'DKCPH', revision: 1 });
        const res = await patch(SEEDED.booked, { destination: 'NLRTM', revision: 1 });

        expect(res.status).toBe(409);
        expect(stored(SEEDED.booked)).toEqual({ destination: 'DKCPH', revision: 2 });
        expect(auditRows(SEEDED.booked)).toHaveLength(1);
    });

    it('AC4: rolls back the shipment update when the audit insert fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        db.exec(`CREATE TRIGGER fail_audit BEFORE INSERT ON shipment_audit
                 BEGIN SELECT RAISE(ABORT, 'audit insert failed'); END`);

        const res = await patch(SEEDED.booked, { destination: 'DKCPH', revision: 1 });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ code: 'INTERNAL_ERROR', message: 'Something went wrong' });
        expectUnchanged(SEEDED.booked, 'DEHAM');
    });

    it.each([
        ['missing', null],
        ['blank', '   '],
        ['too long', 'a'.repeat(201)],
    ])('AC8: rejects a %s X-Actor with 400', async (_label, actor) => {
        const res = await patch(SEEDED.booked, { destination: 'DKCPH', revision: 1 }, actor);

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_ACTOR');
        expectUnchanged(SEEDED.booked, 'DEHAM');
    });

    it('AC8: stores the trimmed actor', async () => {
        await patch(SEEDED.booked, { destination: 'DKCPH', revision: 1 }, `  ${ACTOR}  `);

        expect(auditRows(SEEDED.booked)[0]?.['actor']).toBe(ACTOR);
    });

    it.each([[undefined], [0], [-1], [1.5], ['1']])(
        'AC9: rejects revision %j with 400',
        async (revision) => {
            const res = await patch(SEEDED.booked, { destination: 'DKCPH', revision });

            expect(res.status).toBe(400);
            expect(res.body.code).toBe('INVALID_REVISION');
            expectUnchanged(SEEDED.booked, 'DEHAM');
        },
    );

    it('AC10: returns 404 for an unknown shipment', async () => {
        const res = await patch(UNKNOWN_ID, { destination: 'DKCPH', revision: 1 });

        expect(res.status).toBe(404);
        expect(res.body.code).toBe('NOT_FOUND');
    });

    it('AC10: returns 400 for a malformed id', async () => {
        const res = await patch('not-a-uuid', { destination: 'DKCPH', revision: 1 });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_ID');
    });

    it('AC11: input errors come first, id before actor before destination before revision', async () => {
        const badId = await patch('not-a-uuid', { destination: 'x', revision: 0 }, null);
        const badActor = await patch(SEEDED.booked, { destination: 'x', revision: 0 }, null);
        const badDestination = await patch(SEEDED.booked, { destination: 'x', revision: 0 });

        expect(badId.body.code).toBe('INVALID_ID');
        expect(badActor.body.code).toBe('INVALID_ACTOR');
        expect(badDestination.body.code).toBe('INVALID_DESTINATION');
    });

    it('AC11: a bad input on an unknown shipment returns 400, not 404', async () => {
        const res = await patch(UNKNOWN_ID, { destination: 'DKCPH', revision: 0 });

        expect(res.status).toBe(400);
    });

    it('AC11: a stale revision wins over rule violations', async () => {
        const notBooked = await patch(SEEDED.loaded, { destination: 'DEHAM', revision: 5 });
        const unknownTerminal = await patch(SEEDED.booked, { destination: 'SEGOT', revision: 5 });

        expect(notBooked.status).toBe(409);
        expect(unknownTerminal.status).toBe(409);
    });

    it('AC11: not BOOKED wins over unknown terminal', async () => {
        const res = await patch(SEEDED.loaded, { destination: 'SEGOT', revision: 1 });

        expect(res.body.code).toBe('SHIPMENT_NOT_BOOKED');
    });

    it('AC13: returns 400 for a malformed JSON body', async () => {
        const res = await request(buildApp(db, () => NOW))
            .patch(`/shipments/${SEEDED.booked}/destination`)
            .set('X-Actor', ACTOR)
            .set('Content-Type', 'application/json')
            .send('{"destination": ');

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_JSON');
    });
});

describe('GET /shipments/:id revision', () => {
    it('AC12: includes revision', async () => {
        const res = await request(buildApp(db)).get(`/shipments/${SEEDED.booked}`);

        expect(res.body.revision).toBe(1);
    });
});

describe('AC14: database constraints', () => {
    it('AC14: rejects a revision below 1', () => {
        expect(() =>
            db.prepare('UPDATE shipments SET revision = 0 WHERE id = ?').run(SEEDED.booked),
        ).toThrow(/CHECK constraint failed/);
    });

    it('AC14: rejects an audit row for an unknown shipment', () => {
        expect(() =>
            db
                .prepare(
                    `INSERT INTO shipment_audit (shipment_id, field, old_value, new_value, actor, changed_at)
                     VALUES (?, 'destination', 'DEHAM', 'DKCPH', 'ops', ?)`,
                )
                .run(UNKNOWN_ID, NOW),
        ).toThrow(/FOREIGN KEY constraint failed/);
    });

    it('AC14: rejects an audit row with a blank actor', () => {
        expect(() =>
            db
                .prepare(
                    `INSERT INTO shipment_audit (shipment_id, field, old_value, new_value, actor, changed_at)
                     VALUES (?, 'destination', 'DEHAM', 'DKCPH', '  ', ?)`,
                )
                .run(SEEDED.booked, NOW),
        ).toThrow(/CHECK constraint failed/);
    });
});
